import { test, expect } from '@playwright/test';
import { stubAuthApi } from '../_support/auth-stub';

test.use({ serviceWorkers: 'block' });

test('visitor logs in — login', async ({ page }) => {
  await stubAuthApi(page);
  await page.goto('/#/login');
  await page.getByLabel('Email').fill('admin@b2b-portal.example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button').click();
  await expect(page.getByTestId('admin-customers-screen')).toBeVisible({ timeout: 10_000 });
});
