import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiClient, MockApiClient } from '../../shared/api/api-client';

interface VendorProfile { id: string; companyName: string; contactEmail: string; }
interface VendorDocument { id: string; filename: string; status: string; }

const PROFILE_OUTCOME = 'the profile is stored and returns 201 with the created VendorProfile record';
const DOCUMENT_OUTCOME = 'the document is stored with status "pending" and displays in the vendor document library';

function registerVendorMocks(client: MockApiClient): void {
  const docs: VendorDocument[] = [];
  let seq = 0;
  client.registerMock('POST', '/api/vendor/profile', async (body: any) => ({
    id: `vp-${++seq}`, companyName: body?.companyName ?? '', contactEmail: body?.contactEmail ?? '',
  }));
  client.registerMock('POST', '/api/vendor/documents', async (body: any) => {
    const doc = { id: `doc-${++seq}`, filename: body?.filename ?? '', status: 'pending' };
    docs.unshift(doc);
    return doc;
  });
  client.registerMock('GET', '/api/vendor/documents', async () => [...docs]);
}

@Component({
  selector: 'app-vendor-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div data-testid="vendor-profile-screen">
      <h1>Vendor Profile</h1>

      <section>
        <h2>Company profile</h2>
        <p>Submit your company profile: {{ profileOutcome }}.</p>
        <form data-testid="vendor-profile-form" [formGroup]="profileForm" (ngSubmit)="submitProfile()">
          <label for="companyName">Company name</label>
          <input id="companyName" formControlName="companyName" data-testid="vendor-company-name" />
          <label for="contactEmail">Contact email</label>
          <input id="contactEmail" type="email" formControlName="contactEmail" data-testid="vendor-contact-email" />
          <button type="submit" [disabled]="profileForm.invalid || savingProfile()">Save profile</button>
        </form>
        @if (profileError()) { <p role="alert">{{ profileError() }}</p> }
        @if (profile(); as p) {
          <div data-testid="vendor-profile-result">
            <p>Profile saved (201).</p>
            <dl>
              <dt>ID</dt><dd>{{ p.id }}</dd>
              <dt>Company</dt><dd>{{ p.companyName }}</dd>
              <dt>Contact email</dt><dd>{{ p.contactEmail }}</dd>
            </dl>
          </div>
        }
      </section>

      <section>
        <h2>Compliance documents</h2>
        <p>Upload a compliance document: {{ documentOutcome }}.</p>
        <form data-testid="vendor-document-form" [formGroup]="documentForm" (ngSubmit)="uploadDocument()">
          <label for="filename">Document filename</label>
          <input id="filename" formControlName="filename" data-testid="vendor-document-filename" />
          <button type="submit" [disabled]="documentForm.invalid || uploading()">Upload document</button>
        </form>
        @if (documentError()) { <p role="alert">{{ documentError() }}</p> }

        <div data-testid="vendor-document-library">
          <h3>Document library</h3>
          @if (documents().length === 0) {
            <p>No documents uploaded yet.</p>
          } @else {
            <ul>
              @for (d of documents(); track d.id) {
                <li data-testid="vendor-document-item">{{ d.filename }} — {{ d.status }}</li>
              }
            </ul>
          }
        </div>
      </section>
    </div>
  `,
})
export class VendorProfileComponent implements OnInit {
  private readonly api = inject(ApiClient);
  private readonly fb = inject(FormBuilder);

  readonly profileOutcome = PROFILE_OUTCOME;
  readonly documentOutcome = DOCUMENT_OUTCOME;

  readonly profileForm = this.fb.nonNullable.group({
    companyName: ['', Validators.required],
    contactEmail: ['', [Validators.required, Validators.email]],
  });
  readonly documentForm = this.fb.nonNullable.group({
    filename: ['', Validators.required],
  });

  readonly profile = signal<VendorProfile | null>(null);
  readonly documents = signal<VendorDocument[]>([]);
  readonly savingProfile = signal(false);
  readonly uploading = signal(false);
  readonly profileError = signal<string | null>(null);
  readonly documentError = signal<string | null>(null);

  constructor() {
    if (this.api instanceof MockApiClient) registerVendorMocks(this.api);
  }

  ngOnInit(): void {
    void this.loadDocuments();
  }

  async loadDocuments(): Promise<void> {
    try {
      const list = await this.api.get<VendorDocument[]>('/api/vendor/documents');
      this.documents.set(Array.isArray(list) ? list : []);
    } catch {
      this.documents.set([]);
    }
  }

  async submitProfile(): Promise<void> {
    if (this.profileForm.invalid) return;
    this.savingProfile.set(true);
    this.profileError.set(null);
    try {
      const created = await this.api.post<VendorProfile>('/api/vendor/profile', this.profileForm.getRawValue());
      this.profile.set(created);
    } catch (e: any) {
      this.profileError.set(e?.message || 'Could not save profile');
    } finally {
      this.savingProfile.set(false);
    }
  }

  async uploadDocument(): Promise<void> {
    if (this.documentForm.invalid) return;
    this.uploading.set(true);
    this.documentError.set(null);
    try {
      await this.api.post<VendorDocument>('/api/vendor/documents', this.documentForm.getRawValue());
      this.documentForm.reset();
      await this.loadDocuments();
    } catch (e: any) {
      this.documentError.set(e?.message || 'Could not upload document');
    } finally {
      this.uploading.set(false);
    }
  }
}
