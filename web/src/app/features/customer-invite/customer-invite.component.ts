import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient, ApiError, ConflictError, MockApiClient } from '../../shared/api/api-client';

/** Contract: GET /api/admin/customers response row. */
export interface CustomerRow {
  id: string;
  email: string;
}

/** Contract: POST /api/admin/customers/invite response. */
export interface InviteCustomerResponse {
  customerId: string;
  email: string;
  invitationSent: boolean;
}

const LIST_PATH = '/api/admin/customers';
const INVITE_PATH = '/api/admin/customers/invite';

export const INVITE_RULE = 'a Customer record is created and returns 201 with invitationSent true';
export const DUPLICATE_RULE = 'the response returns 409 error indicating the customer already exists';

/** Register in-memory mocks when the app runs against MockApiClient. */
function registerMocks(client: MockApiClient): void {
  const customers: CustomerRow[] = [];
  client.registerMock<CustomerRow[]>('GET', LIST_PATH, async () => [...customers]);
  client.registerMock<InviteCustomerResponse>('POST', INVITE_PATH, async (body: any) => {
    const email = String(body?.email ?? '').trim().toLowerCase();
    if (customers.some(c => c.email === email)) {
      throw new ConflictError('Customer already exists');
    }
    const row = { id: crypto.randomUUID(), email };
    customers.push(row);
    return { customerId: row.id, email, invitationSent: true };
  });
}

@Component({
  selector: 'app-customer-invite',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div data-testid="admin-customers-screen">
      <h1>Customer Management</h1>

      <section>
        <h2>Invite a customer</h2>
        <p>When you invite a new email, {{ inviteRule }}.</p>
        <p>If a customer with that email already exists, {{ duplicateRule }}.</p>
        <form data-testid="customer-invite-form" (ngSubmit)="invite()">
          <label for="customer-invite-email">Customer email</label>
          <input
            id="customer-invite-email"
            type="email"
            name="email"
            required
            [(ngModel)]="email"
            [disabled]="submitting()"
          />
          <button type="submit" [disabled]="submitting() || !email.trim()">Send invitation</button>
        </form>
        @if (successMessage()) {
          <p role="status" data-testid="customer-invite-success">{{ successMessage() }}</p>
        }
        @if (errorMessage()) {
          <p role="alert" data-testid="customer-invite-error">{{ errorMessage() }}</p>
        }
      </section>

      <section>
        <h2>Customers</h2>
        <ul data-testid="customer-list">
          @for (c of customers(); track c.id) {
            <li>{{ c.email }}</li>
          } @empty {
            <li>No customers invited yet.</li>
          }
        </ul>
      </section>
    </div>
  `,
})
export class CustomerInviteComponent implements OnInit {
  private api = inject(ApiClient);

  readonly inviteRule = INVITE_RULE;
  readonly duplicateRule = DUPLICATE_RULE;

  email = '';
  readonly customers = signal<CustomerRow[]>([]);
  readonly submitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  constructor() {
    if (this.api instanceof MockApiClient) registerMocks(this.api);
  }

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      const rows = await this.api.get<CustomerRow[]>(LIST_PATH);
      this.customers.set(Array.isArray(rows) ? rows : []);
    } catch {
      this.customers.set([]);
    }
  }

  async invite(): Promise<void> {
    const email = this.email.trim();
    if (!email) return;
    this.submitting.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');
    try {
      const res = await this.api.post<InviteCustomerResponse>(INVITE_PATH, { email });
      if (res?.invitationSent) {
        this.successMessage.set(`Invitation sent to ${res.email}: ${INVITE_RULE}.`);
      } else {
        this.successMessage.set(`Customer ${res?.email ?? email} created, but the invitation was not sent.`);
      }
      this.email = '';
      await this.load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        this.errorMessage.set(`${email} was not invited: ${DUPLICATE_RULE}.`);
      } else {
        this.errorMessage.set(err instanceof Error ? err.message : 'Invitation failed.');
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
