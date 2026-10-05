import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

// Hermetic run: the static server has no backend, so the login endpoint is
// stubbed with the role the seeded account carries.
test('admin reaches customer management — login', async ({ page }) => {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'ADMIN-1', email: 'admin@b2b-portal.example.com', role: 'ADMIN' }),
    }),
  );
  await page.goto('/#/login');
  await page.getByLabel('Email').fill('admin@b2b-portal.example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button').click();
  await page.getByTestId('admin-customers-screen').waitFor();
  await expect(page).toHaveURL(/#\/admin\/customers$/);
});
