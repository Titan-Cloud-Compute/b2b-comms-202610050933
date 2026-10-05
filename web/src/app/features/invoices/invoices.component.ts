import { Component, inject } from '@angular/core';
import { ApiClient, MockApiClient } from '../../shared/api/api-client';

/** Contract: POST /api/invoices request. (@contracts/* is not present in this app; types mirror the card contract.) */
export interface CreateInvoiceRequest {
  orderId: string;
  amount: number;
}

/** Contract: POST /api/invoices response. */
export interface InvoiceResponse {
  id: string;
  orderId: string;
  amount: number;
}

/** Contract: GET /api/invoices/:id/download response. */
export interface InvoiceDownloadResponse {
  id: string;
  downloadUrl: string;
}

const mockInvoices = new Map<string, InvoiceResponse>();

/** Register MockApiClient handlers for the invoice endpoints (USE_MOCKS mode only). */
function registerInvoiceMocks(api: ApiClient): void {
  if (!(api instanceof MockApiClient)) return;
  api.registerMock<InvoiceResponse>('POST', '/api/invoices', async (body) => {
    const req = (body ?? {}) as CreateInvoiceRequest;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `inv-${Date.now()}`;
    const invoice: InvoiceResponse = { id, orderId: req.orderId, amount: Number(req.amount) };
    mockInvoices.set(id, invoice);
    // Download handler is keyed by concrete path in MockApiClient.
    api.registerMock<InvoiceDownloadResponse>('GET', `/api/invoices/${id}/download`, async () => ({
      id,
      downloadUrl: `/files/invoices/${id}.pdf`,
    }));
    return invoice;
  });
}

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [],
  template: `
    <div class="page" data-testid="invoices-screen">
      <h1 class="page-title">Invoices</h1>

      <div data-component="InvoiceViewer">
        <section data-testid="invoice-generate-section" class="card">
          <h2>Generate invoice</h2>
          <p>Generate an invoice for a confirmed order: the invoice is created and returns 201 with the invoice id available for download.</p>
          <form data-testid="invoice-generate-form" class="form-grid" (submit)="$event.preventDefault(); generate()">
            <div class="field">
              <label>Order ID
                <input data-testid="invoice-order-id" name="orderId" [value]="orderId"
                       (input)="orderId = $any($event.target).value" required />
              </label>
            </div>
            <div class="field">
              <label>Amount
                <input data-testid="invoice-amount" name="amount" type="number" step="0.01" [value]="amount"
                       (input)="amount = $any($event.target).value" required />
              </label>
            </div>
            <div>
              <button type="submit" class="btn btn-primary" data-testid="invoice-generate-submit" [disabled]="busy">Generate invoice</button>
            </div>
          </form>
          @if (created) {
            <div data-testid="invoice-created" class="table-scroll">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Order ID</th>
                    <th class="num">Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span data-testid="invoice-id">{{ created.id }}</span></td>
                    <td>{{ created.orderId }}</td>
                    <td class="num">{{ created.amount }}</td>
                    <td><span class="status-pill generated">generated</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          }
        </section>

        <section data-testid="invoice-download-section" class="card">
          <h2>Get download link</h2>
          <p>Request the invoice download link: the response returns 200 with a downloadUrl pointing to the stored invoice.</p>
          <form data-testid="invoice-download-form" class="form-grid" (submit)="$event.preventDefault(); download()">
            <div class="field">
              <label>Invoice ID
                <input data-testid="invoice-download-id" name="invoiceId" [value]="invoiceId"
                       (input)="invoiceId = $any($event.target).value" required />
              </label>
            </div>
            <div>
              <button type="submit" class="btn btn-primary" data-testid="invoice-download-submit" [disabled]="busy">Get download link</button>
            </div>
          </form>
          @if (downloadUrl) {
            <p data-testid="invoice-download-url"><a [href]="downloadUrl" target="_blank" rel="noopener">{{ downloadUrl }}</a></p>
          }
        </section>
      </div>

      @if (error) {
        <p role="alert" data-testid="invoice-error">{{ error }}</p>
      }
    </div>
  `,
})
export class InvoicesComponent {
  private readonly api = inject(ApiClient);

  orderId = '';
  amount = '';
  invoiceId = '';
  created: InvoiceResponse | null = null;
  downloadUrl = '';
  error = '';
  busy = false;

  constructor() {
    registerInvoiceMocks(this.api);
  }

  async generate(): Promise<void> {
    this.error = '';
    this.busy = true;
    try {
      const req: CreateInvoiceRequest = { orderId: this.orderId.trim(), amount: Number(this.amount) };
      this.created = await this.api.post<InvoiceResponse>('/api/invoices', req);
      this.invoiceId = this.created.id;
    } catch (e: any) {
      this.error = e?.message || 'Failed to generate invoice';
    } finally {
      this.busy = false;
    }
  }

  async download(): Promise<void> {
    this.error = '';
    this.busy = true;
    try {
      const id = encodeURIComponent(this.invoiceId.trim());
      const res = await this.api.get<InvoiceDownloadResponse>(`/api/invoices/${id}/download`);
      this.downloadUrl = res.downloadUrl;
    } catch (e: any) {
      this.error = e?.message || 'Failed to get download link';
    } finally {
      this.busy = false;
    }
  }
}
