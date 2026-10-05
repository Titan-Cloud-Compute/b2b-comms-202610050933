import { Component, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../shared/auth.service';
import { AuthApi } from '../shared/api/auth-api.service';
import { ConflictError, BadRequestError } from '../shared/api/api-errors';
import { landingRouteFor, sessionRoleFor } from '../login/login.component';

/** How long the "Account created" confirmation stays up before role landing. */
const SUCCESS_REDIRECT_MS = 1500;

/**
 * Single-step signup: email + password, one submit button.
 * Calls the backend /api/auth/signup, stores the role the backend returned,
 * shows "Account created", then navigates to landingRouteFor(role).
 */
@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styleUrl: './signup.component.css',
  template: `
    <div class="signup-container">
      <div class="signup-card">
        <div class="logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" style="fill: var(--color-primary)"/>
            <path d="M14 24L22 32L34 16" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h1>Create Account</h1>
        <p class="subtitle">Join the Enterprise Platform</p>

        @if (created()) {
          <div class="success-message" role="status">Account created</div>
        }

        <form (ngSubmit)="onSignup()" class="signup-form">
          @if (error()) {
            <div class="error-message" role="alert">{{ error() }}</div>
          }

          <div class="form-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              [(ngModel)]="email"
              name="email"
              placeholder="email@company.com"
              required
              autocomplete="email"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              [(ngModel)]="password"
              name="password"
              placeholder="Min 8 characters"
              required
              autocomplete="new-password"
            />
          </div>

          <button type="submit" class="btn-primary" [disabled]="isLoading() || created()">
            @if (isLoading()) {
              <span class="spinner"></span>
              Creating account...
            } @else {
              Create account
            }
          </button>
        </form>

        <p class="login-link">
          Already have an account?
          <a routerLink="/login">Sign in</a>
        </p>
      </div>
    </div>
  `
})
export class SignupComponent implements OnDestroy {
  email = '';
  password = '';
  error = signal<string | null>(null);
  isLoading = signal(false);
  created = signal(false);

  auth = inject(AuthService);
  private authApi = inject(AuthApi);
  private router = inject(Router);
  private redirectTimer?: ReturnType<typeof setTimeout>;

  ngOnDestroy() {
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
  }

  async onSignup() {
    this.error.set(null);

    const email = this.email.trim();
    if (!email || !this.password) {
      this.error.set('Please fill in all fields');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email)) {
      this.error.set('Please enter a valid email address');
      return;
    }
    if (this.password.length < 8) {
      this.error.set('Password must be at least 8 characters');
      return;
    }

    this.isLoading.set(true);
    try {
      const user = await this.authApi.signup({ email, password: this.password });
      const role = sessionRoleFor(user.role);
      this.auth.setUser({
        id: user.id,
        email: user.email,
        name: user.email.split('@')[0],
        role,
      });
      this.created.set(true);
      this.redirectTimer = setTimeout(() => {
        void this.router.navigate([landingRouteFor(user.role)]);
      }, SUCCESS_REDIRECT_MS);
    } catch (err) {
      if (err instanceof ConflictError) {
        // Email already registered: if the same credentials are valid, sign in
        // and continue to the same confirmation + /orders landing.
        try {
          const existing = await this.authApi.login({ email, password: this.password });
          const existingRole = sessionRoleFor(existing.role);
          this.auth.setUser({
            id: existing.id,
            email: existing.email,
            name: existing.email.split('@')[0],
            role: existingRole,
          });
          this.created.set(true);
          this.redirectTimer = setTimeout(() => {
            void this.router.navigate([landingRouteFor(existing.role)]);
          }, SUCCESS_REDIRECT_MS);
        } catch {
          this.error.set('An account with this email already exists');
        }
      } else if (err instanceof BadRequestError) {
        this.error.set('Invalid signup data');
      } else {
        this.error.set('Signup failed. Please try again.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
