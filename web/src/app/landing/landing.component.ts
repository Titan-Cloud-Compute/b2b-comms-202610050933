import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface LandingHighlight {
  id: string;
  text: string;
}

interface LandingCta {
  id: string;
  role: string;
  label: string;
  link: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="landing-page" data-testid="landing-page">
      <section class="landing-hero">
        <h1 class="landing-title">B2B Vendor &amp; Customer Workspace Portal</h1>
        <p class="landing-subtitle">Streamline onboarding, communications, and invoicing between vendors and customers in one place.</p>
        <div class="landing-actions">
          <a routerLink="/dashboard" class="btn btn-primary" data-testid="landing-hero-cta">Get Started</a>
          <a routerLink="/login" class="btn btn-secondary">Sign In</a>
        </div>
      </section>

      <section class="landing-section" aria-labelledby="landing-benefits-title">
        <h2 id="landing-benefits-title" class="landing-section-title">Why teams use the portal</h2>
        <div class="landing-grid">
          @for (h of highlights; track h.id) {
            <article class="landing-card" [id]="h.id" [attr.data-testid]="h.id">
              <p class="landing-card-text">{{ h.text }}</p>
            </article>
          }
        </div>
      </section>

      <section class="landing-section" aria-labelledby="landing-roles-title">
        <h2 id="landing-roles-title" class="landing-section-title">Choose your workspace</h2>
        <div class="landing-grid">
          @for (c of ctas; track c.id) {
            <div class="landing-card landing-role">
              <span class="landing-role-name">{{ c.role }}</span>
              <a [routerLink]="c.link" class="btn btn-primary" [id]="c.id" [attr.data-testid]="c.id">{{ c.label }}</a>
            </div>
          }
        </div>
      </section>
    </main>
  `,
  styles: [`
    .landing-page {
      min-height: 100vh;
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      font-family: var(--font-body);
      padding: 3rem 1.25rem;
      box-sizing: border-box;
    }
    .landing-hero {
      text-align: center;
      margin: 0 auto 3rem;
      max-width: 960px;
    }
    .landing-title {
      font-family: var(--font-display);
      font-size: clamp(1.75rem, 4vw, 2.75rem);
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 0.75rem;
    }
    .landing-subtitle {
      color: var(--color-text-secondary);
      font-size: 1.125rem;
      margin: 0 auto 2rem;
      max-width: 640px;
    }
    .landing-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .landing-section {
      max-width: 1100px;
      margin: 0 auto 3rem;
    }
    .landing-section-title {
      font-family: var(--font-display);
      font-size: 1.25rem;
      text-align: center;
      margin: 0 0 1.25rem;
      color: var(--color-text-primary);
    }
    .landing-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    @media (min-width: 768px) {
      .landing-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    .landing-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
      padding: 1.5rem;
    }
    .landing-card-text {
      margin: 0;
      color: var(--color-text-primary);
      font-weight: 500;
    }
    .landing-role {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .landing-role-name {
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      padding: 0.75rem 1.5rem;
      border-radius: var(--radius-md);
      font-weight: 600;
      text-decoration: none;
      font-size: 1rem;
    }
    .btn-primary {
      background: var(--color-primary);
      color: var(--color-on-primary);
    }
    .btn-primary:hover {
      background: var(--color-primary-hover);
    }
    .btn-secondary {
      background: var(--color-surface);
      color: var(--color-primary);
      border: 1px solid var(--color-primary-border);
    }
    .btn-secondary:hover {
      background: var(--color-surface-hover);
    }
  `]
})
export class LandingComponent {
  readonly highlights: LandingHighlight[] = [
    { id: 'landing-highlight-0', text: 'Shared channels for real-time vendor-customer communication' },
    { id: 'landing-highlight-1', text: 'Integrated invoice management and approval workflows' },
    { id: 'landing-highlight-2', text: 'Role-based access for admins, vendors, and customers' },
  ];

  readonly ctas: LandingCta[] = [
    { id: 'landing-cta-admin', role: 'Admin', label: 'Get Started', link: '/dashboard' },
    { id: 'landing-cta-vendor', role: 'Vendor', label: 'View Orders', link: '/orders' },
    { id: 'landing-cta-customer', role: 'Customer', label: 'Track Invoices', link: '/invoices' },
  ];
}
