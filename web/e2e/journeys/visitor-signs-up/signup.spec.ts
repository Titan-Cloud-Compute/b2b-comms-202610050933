import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

// Hermetic run: the static server has no backend, so the signup endpoint is
// stubbed; a self-registered account is a vendor.
test('visitor signs up — signup', async ({ page }) => {
  await page.route('**/api/auth/signup', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'new-1', email: 'newuser@example.com', role: 'VENDOR' }),
    }),
  );
  await page.goto('/#/signup');
  await page.getByLabel('Email').fill('newuser@example.com');
  await page.getByLabel('Password').fill('Password1!');
  await page.getByRole('button').click();
  await page.getByText('Account created').waitFor();
  await expect(page).toHaveURL(/#\/vendor\/profile$/);
});
