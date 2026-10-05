import { test, expect } from '@playwright/test';
import { stubAuthApi } from '../_support/auth-stub';

test.use({ serviceWorkers: 'block' });

test('visitor signs up — signup', async ({ page }) => {
  await stubAuthApi(page);
  await page.goto('/#/signup');
  await page.getByLabel('Email').fill('newuser@example.com');
  await page.getByLabel('Password').fill('Password1!');
  await page.getByRole('button').click();
  await expect(page.getByText('Account created')).toBeVisible();
  await expect(page).toHaveURL(/#\/vendor\/profile/, { timeout: 10_000 });
});
