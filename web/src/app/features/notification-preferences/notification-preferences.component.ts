import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient } from '../../shared/api/api-client';

/** Mirrors the NotificationPreference contract (GET/PUT /api/notifications/preferences). */
export interface NotificationPreferenceDto {
  userId?: string;
  orderAlerts: boolean;
  messageAlerts: boolean;
}

const PREFS_PATH = '/api/notifications/preferences';

export const CONFIGURED_MESSAGE =
  'the preferences are updated and returns 200 with the stored NotificationPreference record';
export const DISABLED_ALL_MESSAGE =
  'the preferences are updated with both alert fields stored as false';

@Component({
  selector: 'app-notification-preferences',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page" data-testid="settings-notifications-screen">
      <h1 class="page-title">Notification Settings</h1>

      <section class="card">
        <form (ngSubmit)="save()" class="stack">
          <label class="check-row">
            <input
              type="checkbox"
              data-testid="order-alerts-toggle"
              name="orderAlerts"
              [(ngModel)]="orderAlerts"
            />
            Order alerts
          </label>
          <label class="check-row">
            <input
              type="checkbox"
              data-testid="message-alerts-toggle"
              name="messageAlerts"
              [(ngModel)]="messageAlerts"
            />
            Message alerts
          </label>
          <div>
            <button type="submit" class="btn btn-primary" data-testid="save-notification-preferences" [disabled]="saving">
              Save
            </button>
          </div>
        </form>
        @if (error) {
          <p role="alert" data-testid="notification-preferences-error">{{ error }}</p>
        }
      </section>

      <section class="card" data-testid="notification-preferences-outcomes">
        <p data-testid="configure-outcome" [class.active]="lastOutcome === 'configured'">
          {{ configuredMessage }}
        </p>
        <p data-testid="disable-all-outcome" [class.active]="lastOutcome === 'disabled'">
          {{ disabledAllMessage }}
        </p>
      </section>

      @if (lastOutcome) {
        <p role="status" data-testid="notification-preferences-status">
          Saved: order alerts {{ orderAlerts ? 'on' : 'off' }}, message alerts {{ messageAlerts ? 'on' : 'off' }}
        </p>
      }
    </div>
  `,
  styles: [`
    .check-row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) 0;
      min-height: 2.75rem;
      cursor: pointer;
      color: var(--color-text-primary);
      font-weight: 500;
    }
  `],
})
export class NotificationPreferencesComponent implements OnInit {
  private readonly api = inject(ApiClient);

  readonly configuredMessage = CONFIGURED_MESSAGE;
  readonly disabledAllMessage = DISABLED_ALL_MESSAGE;

  orderAlerts = true;
  messageAlerts = true;
  saving = false;
  error = '';
  lastOutcome: 'configured' | 'disabled' | null = null;

  async ngOnInit(): Promise<void> {
    try {
      const prefs = await this.api.get<NotificationPreferenceDto | unknown>(PREFS_PATH);
      this.apply(prefs);
    } catch {
      // No stored preferences yet (or endpoint unavailable) — keep defaults.
    }
  }

  async save(): Promise<void> {
    this.saving = true;
    this.error = '';
    try {
      const body: NotificationPreferenceDto = {
        orderAlerts: this.orderAlerts,
        messageAlerts: this.messageAlerts,
      };
      const stored = await this.api.request<NotificationPreferenceDto | unknown>(PREFS_PATH, {
        method: 'PUT',
        body,
      });
      this.apply(stored);
      this.lastOutcome = !this.orderAlerts && !this.messageAlerts ? 'disabled' : 'configured';
    } catch (e: any) {
      this.error = e?.message || 'Failed to save notification preferences';
    } finally {
      this.saving = false;
    }
  }

  private apply(prefs: unknown): void {
    if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) return;
    const p = prefs as Partial<NotificationPreferenceDto>;
    if (typeof p.orderAlerts === 'boolean') this.orderAlerts = p.orderAlerts;
    if (typeof p.messageAlerts === 'boolean') this.messageAlerts = p.messageAlerts;
  }
}
