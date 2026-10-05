import { Component, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, User, landingRouteFor, mapUserRole } from '../shared/auth.service';
import { AuthApi } from '../shared/api/auth-api.service';
import { BadRequestError } from '../shared/api/api-errors';

/**
 * Single-step signup: email + password. On success the account is created,
 * "Account created" is shown, and the user is taken to their role's landing
 * page (a self-registered account is a vendor → /vendor/profile).
 */
@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styleUrl: './signup.component.css',
  template: `
    <div class="signup-container">
      <div class="signup-card">
        <h1>Create Account</h1>
        <p class="subtitle">Sign up with your email and a password</p>

        <form (ngSubmit)="onSignup()" class="signup-form">
          @if (error()) {
            <div class="error-message" role="alert">{{ error() }}</div>
          }
          @if (success()) {
            <div class="success-message" role="status">Account created</div>
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

          <button type="submit" class="btn-primary" [disabled]="isLoading() || success()">
            {{ isLoading() ? 'Creating account...' : 'Sign up' }}
          </button>
        </form>

        <p class="login-link">
          Already have an account? <a routerLink="/login">Log in</a>
        </p>
      </div>
    </div>
  `,
})
export class SignupComponent implements OnDestroy {
  email = '';
  password = '';
  error = signal<string | null>(null);
  success = signal(false);
  isLoading = signal(false);

  private auth = inject(AuthService);
  private authApi = inject(AuthApi);
  private router = inject(Router);
  private redirectTimer: ReturnType<typeof setTimeout> | null = null;

  async onSignup() {
    this.error.set(null);
    if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      this.error.set('Please enter a valid email address');
      return;
    }
    if (!this.password || this.password.length < 8) {
      this.error.set('Password must be at least 8 characters');
      return;
    }

    this.isLoading.set(true);
    try {
      const result = await this.authApi.signup({
        email: this.email,
        password: this.password,
      });
      const user: User = {
        id: result.id,
        email: result.email,
        name: result.email.split('@')[0],
        role: mapUserRole(result.role ?? 'VENDOR'),
      };
      this.auth.setUser(user);
      this.success.set(true);
      // Leave "Account created" on screen briefly before moving on.
      this.redirectTimer = setTimeout(() => {
        this.router.navigateByUrl(landingRouteFor(user.role));
      }, 1500);
    } catch (err) {
      this.error.set(
        err instanceof BadRequestError
          ? 'Could not create account. Check your details or log in instead.'
          : 'Something went wrong. Please try again.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  ngOnDestroy() {
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
  }
}
