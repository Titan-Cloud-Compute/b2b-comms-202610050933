import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

// Hermetic run: the static server has no backend, so the login endpoint is
// stubbed with the role the seeded account carries.
test('customer reaches orders — login', async ({ page }) => {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'CUSTOMER-1', email: 'buyer@corp.example.com', role: 'CUSTOMER' }),
    }),
  );
  await page.goto('/#/login');
  await page.getByLabel('Email').fill('buyer@corp.example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button').click();
  await page.getByTestId('orders-screen').waitFor();
  await expect(page).toHaveURL(/#\/orders$/);
});
