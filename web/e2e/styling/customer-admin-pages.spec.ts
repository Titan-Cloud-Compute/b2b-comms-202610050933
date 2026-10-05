/**
 * Styling oracle: Orders, Customer Management and Audit Log pages render with
 * the shared page primitives (.page, .page-title, data-component="OrderQueue"),
 * carry the display font, and do not overflow horizontally at 390 px or 1280 px.
 */
import { test, expect } from '@playwright/test';
import { mockApi, login } from '../spec/_support';

test.use({ serviceWorkers: 'block' });

const PAGES = [
  { path: '/#/orders',            testId: 'orders-screen' },
  { path: '/#/admin/customers',   testId: 'admin-customers-screen' },
  { path: '/#/admin/audit-log',   testId: 'admin-audit-log-screen' },
];

const VIEWPORTS = [
  { width: 390,  height: 844  },
  { width: 1280, height: 800  },
];

for (const vp of VIEWPORTS) {
  test.describe(`viewport ${vp.width}×${vp.height}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(vp);
      await mockApi(page);
      await login(page);
    });

    for (const { path, testId } of PAGES) {
      test(`${path} — page primitives and no horizontal overflow`, async ({ page }) => {
        await page.goto(path);

        // Screen root is visible
        await expect(page.getByTestId(testId)).toBeVisible();

        // .page exists inside main.main-content
        const pageEl = page.locator('main.main-content .page').first();
        await expect(pageEl).toBeAttached();

        // .page-title uses the display font (Salesforce-Avant-Garde)
        const fontFamily = await page.locator('.page-title').first().evaluate(
          el => getComputedStyle(el).fontFamily,
        );
        expect(fontFamily).toContain('Salesforce-Avant-Garde');

        // No horizontal overflow
        const overflows = await page.evaluate(() =>
          document.documentElement.scrollWidth <= window.innerWidth,
        );
        expect(overflows).toBe(true);
      });
    }

    test('/#/orders — OrderQueue container is attached', async ({ page }) => {
      await page.goto('/#/orders');
      await expect(page.locator('[data-component="OrderQueue"]')).toBeAttached();
    });
  });
}
