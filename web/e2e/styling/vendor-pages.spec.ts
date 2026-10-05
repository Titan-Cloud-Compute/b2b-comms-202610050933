/**
 * Styling oracle: vendor pages render with shared page primitives.
 * Checks .page wrapper, .page-title font, and no horizontal overflow at
 * mobile (390×844) and desktop (1280×800) viewports.
 */
import { test, expect } from '@playwright/test';
import { mockApi, login } from '../spec/_support';

const ROUTES = [
  { path: '/#/vendor/profile',         testid: 'vendor-profile-screen' },
  { path: '/#/channels',               testid: 'channels-screen' },
  { path: '/#/invoices',               testid: 'invoices-screen' },
  { path: '/#/settings/notifications', testid: 'settings-notifications-screen' },
] as const;

const VIEWPORTS = [
  { width: 390,  height: 844 },
  { width: 1280, height: 800 },
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`viewport ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of ROUTES) {
      test(`${route.path} — page primitives`, async ({ page }) => {
        await mockApi(page);
        await login(page);
        await page.goto(route.path);

        // Screen testid is visible
        await expect(page.getByTestId(route.testid)).toBeVisible();

        // .page element is present inside main.main-content
        await expect(page.locator('main.main-content .page')).toBeAttached();

        // .page-title uses the display (Salesforce-Avant-Garde) font
        const fontFamily = await page
          .locator('main.main-content .page-title')
          .evaluate((el) => getComputedStyle(el).fontFamily);
        expect(fontFamily).toContain('Salesforce-Avant-Garde');

        // No horizontal overflow
        const noOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        );
        expect(noOverflow).toBe(true);
      });
    }

    test('channels — ChannelList component is attached', async ({ page }) => {
      await mockApi(page);
      await login(page);
      await page.goto('/#/channels');
      await expect(page.locator('[data-component="ChannelList"]')).toBeAttached();
    });

    test('invoices — InvoiceViewer component is attached', async ({ page }) => {
      await mockApi(page);
      await login(page);
      await page.goto('/#/invoices');
      await expect(page.locator('[data-component="InvoiceViewer"]')).toBeAttached();
    });
  });
}
