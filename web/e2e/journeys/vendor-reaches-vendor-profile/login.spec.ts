import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

// Hermetic run: the static server has no backend, so the login endpoint is
// stubbed with the role the seeded account carries.
test('vendor reaches vendor profile — login', async ({ page }) => {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'VENDOR-1', email: 'vendor@acme.example.com', role: 'VENDOR' }),
    }),
  );
  await page.goto('/#/login');
  await page.getByLabel('Email').fill('vendor@acme.example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button').click();
  await page.getByTestId('vendor-profile-screen').waitFor();
  await expect(page).toHaveURL(/#\/vendor\/profile$/);
});
