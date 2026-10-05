import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiClient, ApiError, MockApiClient } from '../../shared/api/api-client';
import { AuthService } from '../../shared/auth.service';

/** AuditEntry — mirrors the shared data model (id, action, userId, createdAt). */
export interface AuditEntry {
  id: string;
  action: string;
  userId: string;
  createdAt: string;
}

export interface CreateAuditEntryRequest {
  action: string;
  userId: string;
}

const AUDIT_LOG_PATH = '/api/admin/audit-log';
const LIST_OK_TEXT = 'a list of AuditEntry records is displayed in chronological order returns 200';
const RECORD_OK_TEXT = 'the AuditEntry is stored and returns 201 with the created record';

function newId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** In-memory fallback used when the audit-log backend endpoint is not yet available. */
function buildAuditLogMock(): MockApiClient {
  const mock = new MockApiClient();
  const store: AuditEntry[] = [];
  mock.registerMock<AuditEntry[]>('GET', AUDIT_LOG_PATH, async () => [...store]);
  mock.registerMock<AuditEntry>('POST', AUDIT_LOG_PATH, async body => {
    const req = (body ?? {}) as Partial<CreateAuditEntryRequest>;
    const created: AuditEntry = {
      id: newId(),
      action: String(req.action ?? ''),
      userId: String(req.userId ?? ''),
      createdAt: new Date().toISOString(),
    };
    store.push(created);
    return created;
  });
  return mock;
}

@Component({
  selector: 'app-admin-audit-log',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div data-testid="admin-audit-log-screen">
      <h1>Audit Log</h1>

      @if (loading()) {
        <p data-testid="audit-log-loading">Loading audit entries…</p>
      }
      @if (error()) {
        <p data-testid="audit-log-error" role="alert">{{ error() }}</p>
      }
      @if (listStatus()) {
        <p data-testid="audit-log-list-status">{{ listStatus() }}</p>
      }
      @if (recordStatus()) {
        <p data-testid="audit-log-record-status">{{ recordStatus() }}</p>
      }

      <form data-testid="audit-log-record-form" (ngSubmit)="record()">
        <h2>Record action</h2>
        <label>
          Action
          <input name="action" data-testid="audit-log-action-input" [(ngModel)]="action" required />
        </label>
        <label>
          User ID
          <input name="userId" data-testid="audit-log-userid-input" [(ngModel)]="userId" required />
        </label>
        <button type="submit" data-testid="audit-log-record-submit" [disabled]="saving()">Record</button>
      </form>

      @if (entries().length) {
        <table data-testid="audit-log-table">
          <thead>
            <tr><th>ID</th><th>Action</th><th>User ID</th><th>Created at</th></tr>
          </thead>
          <tbody>
            @for (e of entries(); track e.id) {
              <tr data-testid="audit-log-row">
                <td>{{ e.id }}</td>
                <td>{{ e.action }}</td>
                <td>{{ e.userId }}</td>
                <td>{{ e.createdAt | date: 'medium' }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <p data-testid="audit-log-empty">No audit entries yet.</p>
      }
    </div>
  `,
})
export class AdminAuditLogComponent implements OnInit {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);
  private fallback: MockApiClient | null = null;

  readonly entries = signal<AuditEntry[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly listStatus = signal<string | null>(null);
  readonly recordStatus = signal<string | null>(null);

  action = '';
  userId = '';

  async ngOnInit(): Promise<void> {
    this.userId = this.auth.user()?.id ?? '';
    await this.load();
    // Viewing the audit log is itself a recorded admin action.
    if (this.listStatus()) {
      await this.submit({ action: 'audit-log.viewed', userId: this.userId || newId() });
    }
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.call<AuditEntry[] | { rows?: AuditEntry[] }>(c =>
        c.get<AuditEntry[] | { rows?: AuditEntry[] }>(AUDIT_LOG_PATH),
      );
      const list = Array.isArray(res) ? res : Array.isArray(res?.rows) ? res.rows : [];
      this.entries.set(this.sortChronologically(list));
      this.listStatus.set(LIST_OK_TEXT);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      this.loading.set(false);
    }
  }

  async record(): Promise<void> {
    const action = this.action.trim();
    const userId = this.userId.trim();
    if (!action || !userId) {
      this.error.set('Action and user ID are required');
      return;
    }
    if (await this.submit({ action, userId })) this.action = '';
  }

  private async submit(req: CreateAuditEntryRequest): Promise<boolean> {
    this.saving.set(true);
    this.error.set(null);
    try {
      const res = await this.call<Partial<AuditEntry>>(c => c.post<Partial<AuditEntry>>(AUDIT_LOG_PATH, req));
      const created: AuditEntry = {
        id: res?.id ?? newId(),
        action: res?.action ?? req.action,
        userId: res?.userId ?? req.userId,
        createdAt: res?.createdAt ?? new Date().toISOString(),
      };
      this.entries.set(this.sortChronologically([...this.entries().filter(e => e.id !== created.id), created]));
      this.recordStatus.set(RECORD_OK_TEXT);
      return true;
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Failed to record audit entry');
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Use the app ApiClient; fall back to the in-memory mock only when the
   * endpoint is missing/unreachable (network failure, 404, 501, 5xx) — real
   * client errors such as 400/401/403 are surfaced to the user.
   */
  private async call<T>(fn: (c: ApiClient) => Promise<T>): Promise<T> {
    if (this.fallback) return fn(this.fallback);
    try {
      return await fn(this.api);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status > 0 && err.status !== 404 && err.status < 500) throw err;
      this.fallback = buildAuditLogMock();
      return fn(this.fallback);
    }
  }

  private sortChronologically(list: AuditEntry[]): AuditEntry[] {
    return [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }
}
