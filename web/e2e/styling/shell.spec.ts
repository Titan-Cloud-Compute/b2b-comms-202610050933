/**
 * Styling oracle: every feature route renders inside the shared LayoutComponent
 * shell (sidebar + desktop top bar) with Vendor / Customer / Admin nav groups.
 */
import { test, expect } from '@playwright/test';
import { mockApi, login } from '../spec/_support';

const FEATURE_PATHS = [
  'vendor/profile', 'admin/customers', 'channels', 'orders',
  'invoices', 'settings/notifications', 'admin/audit-log',
];

test.beforeEach(async ({ page }) => {
  await mockApi(page);
  await login(page);
});

for (const path of FEATURE_PATHS) {
  test(`/${path} renders inside the shared shell`, async ({ page }) => {
    await page.goto(`/#/${path}`);
    await expect(page.locator('aside.sidebar nav.sidebar-nav')).toBeVisible();
    await expect(page.locator('main.main-content header.top-bar')).toBeVisible();
    await expect(page.locator('main.main-content .routed-area > *').first()).toBeAttached();
  });
}

test('channels page sits in the main area with grouped nav', async ({ page }) => {
  await page.goto('/#/channels');
  await expect(page.locator('main.main-content [data-testid="channels-screen"]')).toBeAttached();
  const labels = (await page.locator('aside.sidebar .nav-group-label').allTextContents()).map(t => t.trim());
  for (const group of ['Vendor', 'Customer', 'Admin']) expect(labels).toContain(group);
});
