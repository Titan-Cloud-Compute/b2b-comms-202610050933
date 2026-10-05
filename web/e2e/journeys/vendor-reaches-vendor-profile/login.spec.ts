import { test, expect } from '@playwright/test';
import { stubAuthApi } from '../_support/auth-stub';

test.use({ serviceWorkers: 'block' });

test('vendor reaches vendor profile — login', async ({ page }) => {
  await stubAuthApi(page);
  await page.goto('/#/login');
  await page.getByLabel('Email').fill('vendor@acme.example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button').click();
  // VENDOR role lands on vendor/profile
  await expect(page).toHaveURL(/#\/vendor\/profile/, { timeout: 10_000 });
});
