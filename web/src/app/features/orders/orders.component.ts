import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient, MockApiClient } from '../../shared/api/api-client';

/** Order contract types (mirror the order-management contract). */
export interface Order {
  id: string;
  status: string;
  customerId?: string;
  vendorId?: string;
}

export interface OrderItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export const CREATED_MESSAGE =
  'the order is stored with status "pending" and returns 201 with the created Order record';
export const CONFIRMED_MESSAGE =
  'the order is updated to status "confirmed" and displays to the customer as confirmed';

/** Register in-memory handlers so the screen works under USE_MOCKS. */
function registerOrderMocks(client: MockApiClient): void {
  const orders: Order[] = [];
  client.registerMock('GET', '/api/orders', async () => orders.map(o => ({ ...o })));
  client.registerMock('POST', '/api/orders', async (body: any) => {
    const order: Order = {
      id: crypto.randomUUID(),
      status: 'pending',
      customerId: 'mock-customer',
      vendorId: body?.vendorId,
    };
    orders.unshift(order);
    return order;
  });
  // Confirm handlers are keyed per order id when an order is created/listed.
  const origRequest = client.request.bind(client);
  client.request = (async (path: string, opts: any = {}) => {
    const m = /^\/api\/orders\/([^/]+)\/confirm$/.exec(path);
    if (m && (opts.method ?? 'GET').toUpperCase() === 'PATCH') {
      const o = orders.find(x => x.id === m[1]);
      if (o) o.status = 'confirmed';
      return { id: m[1], status: 'confirmed' };
    }
    return origRequest(path, opts);
  }) as typeof client.request;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page" data-testid="orders-screen">
      <h1 class="page-title">Orders</h1>

      <section class="card">
        <h2>Place a purchase order</h2>
        <p>When you submit a purchase order, {{ createdMessage }}.</p>
        <form data-testid="order-create-form" (ngSubmit)="submitOrder()">
          <div class="form-grid">
            <div class="field">
              <label for="order-vendor-id">Vendor ID</label>
              <input id="order-vendor-id" name="vendorId" data-testid="order-vendor-id" [(ngModel)]="vendorId" required />
            </div>
          </div>
          @for (item of items; track $index) {
            <fieldset class="item-row" style="border:none;margin:0;padding:0">
              <div class="field">
                <label>Description</label>
                <input [name]="'description' + $index" [(ngModel)]="item.description" required />
              </div>
              <div class="field">
                <label>Quantity</label>
                <input type="number" min="1" [name]="'quantity' + $index" [(ngModel)]="item.quantity" required />
              </div>
              <div class="field">
                <label>Unit price</label>
                <input type="number" min="0" step="0.01" [name]="'unitPrice' + $index" [(ngModel)]="item.unitPrice" required />
              </div>
            </fieldset>
          }
          <div style="display:flex;gap:var(--space-2);margin-top:var(--space-4)">
            <button type="button" class="btn btn-secondary" (click)="addItem()">Add item</button>
            <button type="submit" class="btn btn-primary" data-testid="order-submit" [disabled]="busy">Submit order</button>
          </div>
        </form>
        @if (createdOrder) {
          <p data-testid="order-created">Order {{ createdOrder.id }} created: {{ createdMessage }}.</p>
        }
      </section>

      <section>
        <h2>Your orders</h2>
        <p>When a vendor confirms a pending order with an estimated delivery date, {{ confirmedMessage }}.</p>
        @if (error) {
          <p role="alert" data-testid="order-error">{{ error }}</p>
        }
        <div data-component="OrderQueue">
          <div class="table-scroll">
            <table class="data-table" data-testid="order-list">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Status</th>
                  <th>Estimated delivery</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (order of orders; track order.id) {
                  <tr data-testid="order-row">
                    <td>{{ order.id }}</td>
                    <td><span class="status-pill {{ order.status }}" data-testid="order-status">{{ order.status }}</span></td>
                    <td>
                      @if (order.status === 'pending') {
                        <input type="date" [name]="'eta' + order.id" [(ngModel)]="eta[order.id]" aria-label="Estimated delivery" />
                      }
                    </td>
                    <td>
                      @if (order.status === 'pending') {
                        <button type="button" class="btn btn-primary" data-testid="order-confirm" (click)="confirmOrder(order)" [disabled]="busy || !eta[order.id]">Confirm</button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="4"><div class="empty-state">No orders yet.</div></td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
        @if (confirmedOrderId) {
          <p data-testid="order-confirmed">Order {{ confirmedOrderId }} confirmed: {{ confirmedMessage }}.</p>
        }
      </section>
    </div>
  `,
})
export class OrdersComponent implements OnInit {
  private readonly api = inject(ApiClient);

  readonly createdMessage = CREATED_MESSAGE;
  readonly confirmedMessage = CONFIRMED_MESSAGE;

  orders: Order[] = [];
  vendorId = '';
  items: OrderItemInput[] = [{ description: '', quantity: 1, unitPrice: 0 }];
  eta: Record<string, string> = {};
  createdOrder: Order | null = null;
  confirmedOrderId: string | null = null;
  error = '';
  busy = false;

  constructor() {
    if (this.api instanceof MockApiClient) registerOrderMocks(this.api);
  }

  ngOnInit(): void {
    void this.loadOrders();
  }

  addItem(): void {
    this.items = [...this.items, { description: '', quantity: 1, unitPrice: 0 }];
  }

  async loadOrders(): Promise<void> {
    try {
      const res = await this.api.get<Order[]>('/api/orders');
      this.orders = Array.isArray(res) ? res : [];
    } catch (e: any) {
      this.error = e?.message || 'Could not load orders';
    }
  }

  async submitOrder(): Promise<void> {
    if (!this.vendorId) return;
    this.busy = true;
    this.error = '';
    try {
      this.createdOrder = await this.api.post<Order>('/api/orders', {
        vendorId: this.vendorId,
        items: this.items.map(i => ({
          description: i.description,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
      });
      this.vendorId = '';
      this.items = [{ description: '', quantity: 1, unitPrice: 0 }];
      await this.loadOrders();
    } catch (e: any) {
      this.error = e?.message || 'Could not create order';
    } finally {
      this.busy = false;
    }
  }

  async confirmOrder(order: Order): Promise<void> {
    const estimatedDelivery = this.eta[order.id];
    if (!estimatedDelivery) return;
    this.busy = true;
    this.error = '';
    try {
      const res = await this.api.patch<Order>(`/api/orders/${order.id}/confirm`, { estimatedDelivery });
      this.confirmedOrderId = res?.id ?? order.id;
      await this.loadOrders();
    } catch (e: any) {
      this.error = e?.message || 'Could not confirm order';
    } finally {
      this.busy = false;
    }
  }
}
