import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiClient, MockApiClient } from '../../shared/api/api-client';

interface Channel { id: string; name: string; }
interface ChannelMessage { id: string; body: string; channelId: string; }

const CHANNEL_OUTCOME = 'the channel is stored and displays in both the vendor and customer channel lists';
const MESSAGE_OUTCOME = 'the message is stored and returns 201 with the created Message record';

function registerChannelMocks(client: MockApiClient): void {
  const channels: Channel[] = [];
  let seq = 0;
  client.registerMock('GET', '/api/channels', async () => channels.map(c => ({ ...c })));
  client.registerMock('POST', '/api/channels', async (body: any) => {
    const ch = { id: `ch-${++seq}`, name: body?.name ?? '' };
    channels.unshift(ch);
    // MockApiClient matches exact paths, so register this channel's message endpoint.
    client.registerMock('POST', `/api/channels/${encodeURIComponent(ch.id)}/messages`, async (b: any) => ({
      id: `msg-${++seq}`, body: b?.body ?? '', channelId: ch.id,
    }));
    return ch;
  });
}

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page" data-testid="channels-screen">
      <h1 class="page-title">Channels</h1>

      <section class="card">
        <h2>Create a shared channel</h2>
        <p>Vendors create a shared channel: {{ channelOutcome }}.</p>
        <form data-testid="channel-create-form" [formGroup]="createForm" (ngSubmit)="createChannel()" class="form-grid">
          <div class="field">
            <label for="channelName">Channel name</label>
            <input id="channelName" formControlName="name" data-testid="channel-name" />
          </div>
          <div>
            <button type="submit" class="btn btn-primary" [disabled]="createForm.invalid || creating()">Create channel</button>
          </div>
        </form>
        @if (createError()) { <p role="alert">{{ createError() }}</p> }
        @if (createdChannel(); as c) {
          <p data-testid="channel-create-result">Channel "{{ c.name }}" created.</p>
        }
      </section>

      <div class="channel-split">
        <section class="card">
          <h2>Your channels</h2>
          @if (listError()) { <p role="alert">{{ listError() }}</p> }
          <ul data-testid="channel-list" data-component="ChannelList">
            @for (c of channels(); track c.id) {
              <li class="list-row">
                <button type="button" data-testid="channel-item" (click)="selectChannel(c)"
                        [attr.aria-pressed]="selected()?.id === c.id">{{ c.name }}</button>
              </li>
            } @empty {
              <li class="empty-state">No channels yet.</li>
            }
          </ul>
        </section>

        <section class="card">
          <h2>Messages</h2>
          <p>Post a message in a channel: {{ messageOutcome }}.</p>
          @if (selected(); as s) {
            <form data-testid="message-form" [formGroup]="messageForm" (ngSubmit)="postMessage()" class="form-grid">
              <div class="field">
                <label for="messageBody">Message to {{ s.name }}</label>
                <textarea id="messageBody" formControlName="body" data-testid="message-body"></textarea>
              </div>
              <div>
                <button type="submit" class="btn btn-primary" [disabled]="messageForm.invalid || posting()">Send</button>
              </div>
            </form>
            @if (messageError()) { <p role="alert">{{ messageError() }}</p> }
            <ul data-testid="message-list">
              @for (m of messages(); track m.id) {
                <li>{{ m.body }}</li>
              }
            </ul>
          } @else {
            <p>Select a channel to post a message.</p>
          }
        </section>
      </div>
    </div>
  `,
})
export class ChannelsComponent implements OnInit {
  private readonly api = inject(ApiClient);
  private readonly fb = inject(FormBuilder);

  readonly channelOutcome = CHANNEL_OUTCOME;
  readonly messageOutcome = MESSAGE_OUTCOME;

  readonly channels = signal<Channel[]>([]);
  readonly selected = signal<Channel | null>(null);
  readonly messages = signal<ChannelMessage[]>([]);
  readonly createdChannel = signal<Channel | null>(null);
  readonly creating = signal(false);
  readonly posting = signal(false);
  readonly createError = signal<string | null>(null);
  readonly listError = signal<string | null>(null);
  readonly messageError = signal<string | null>(null);

  readonly createForm = this.fb.nonNullable.group({ name: ['', Validators.required] });
  readonly messageForm = this.fb.nonNullable.group({ body: ['', Validators.required] });

  constructor() {
    if (this.api instanceof MockApiClient) registerChannelMocks(this.api);
  }

  ngOnInit(): void {
    void this.loadChannels();
  }

  async loadChannels(): Promise<void> {
    this.listError.set(null);
    try {
      const list = await this.api.get<Channel[]>('/api/channels');
      this.channels.set(Array.isArray(list) ? list : []);
    } catch (e: any) {
      this.listError.set(e?.message ?? 'Could not load channels');
    }
  }

  async createChannel(): Promise<void> {
    if (this.createForm.invalid) return;
    this.creating.set(true);
    this.createError.set(null);
    try {
      const ch = await this.api.post<Channel>('/api/channels', { name: this.createForm.getRawValue().name });
      this.createdChannel.set(ch);
      this.createForm.reset();
      await this.loadChannels();
    } catch (e: any) {
      this.createError.set(e?.message ?? 'Could not create channel');
    } finally {
      this.creating.set(false);
    }
  }

  selectChannel(c: Channel): void {
    this.selected.set(c);
    this.messages.set([]);
    this.messageError.set(null);
  }

  async postMessage(): Promise<void> {
    const ch = this.selected();
    if (!ch || this.messageForm.invalid) return;
    this.posting.set(true);
    this.messageError.set(null);
    try {
      const msg = await this.api.post<ChannelMessage>(
        `/api/channels/${encodeURIComponent(ch.id)}/messages`,
        { body: this.messageForm.getRawValue().body },
      );
      this.messages.update(list => [...list, msg]);
      this.messageForm.reset();
    } catch (e: any) {
      this.messageError.set(e?.message ?? 'Could not send message');
    } finally {
      this.posting.set(false);
    }
  }
}
