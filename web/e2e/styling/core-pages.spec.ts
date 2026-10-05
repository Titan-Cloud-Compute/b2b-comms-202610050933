/**
 * Styling oracle: auth card tokens on /login and /signup,
 * and placeholder visibility + no overflow on /dashboard, /settings, /admin/overview.
 */
import { test, expect } from '@playwright/test';
import { mockApi, login } from '../spec/_support';

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => { await mockApi(page); });

const VIEWPORTS = [
  { width: 390, height: 844, label: '390px' },
  { width: 1280, height: 800, label: '1280px' },
];

for (const vp of VIEWPORTS) {
  test(`/#/login auth card tokens at ${vp.label}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/#/login');

    // Primary submit button uses the brand-primary token colour
    const btnBg = await page.locator('button[type="submit"]').evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(btnBg).toBe('rgb(72, 26, 84)');

    // Heading uses the display (Salesforce-Avant-Garde) font
    const fontFamily = await page.locator('h1').first().evaluate(
      (el) => getComputedStyle(el).fontFamily,
    );
    expect(fontFamily).toContain('Salesforce-Avant-Garde');

    // No horizontal overflow
    const noOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(noOverflow).toBe(true);
  });

  test(`/#/signup auth card tokens at ${vp.label}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/#/signup');

    // Primary submit button uses the brand-primary token colour
    const btnBg = await page.locator('button[type="submit"]').evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(btnBg).toBe('rgb(72, 26, 84)');

    // Heading uses the display (Salesforce-Avant-Garde) font
    const fontFamily = await page.locator('h1').first().evaluate(
      (el) => getComputedStyle(el).fontFamily,
    );
    expect(fontFamily).toContain('Salesforce-Avant-Garde');

    // No horizontal overflow
    const noOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(noOverflow).toBe(true);
  });
}

// Post-login placeholder pages
const POST_LOGIN_ROUTES = ['dashboard', 'settings', 'admin/overview'];

for (const vp of VIEWPORTS) {
  for (const route of POST_LOGIN_ROUTES) {
    test(`/#/${route} placeholder visible, no overflow at ${vp.label}`, async ({ page }) => {
      await login(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`/#/${route}`);

      await expect(
        page.locator('main.main-content [data-placeholder]').first(),
      ).toBeVisible();

      const noOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      );
      expect(noOverflow).toBe(true);
    });
  }
}
