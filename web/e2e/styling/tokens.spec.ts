/**
 * Styling oracle: the brand tokens from src/styles/tokens.css are live on every page.
 */
import { test, expect } from '@playwright/test';
import { mockApi } from '../spec/_support';

const cssVar = (name: string) =>
  `getComputedStyle(document.documentElement).getPropertyValue('${name}').trim().toLowerCase()`;

test('login page carries the brand aubergine palette, spacing and type tokens', async ({ page }) => {
  await mockApi(page);
  await page.goto('/#/login');
  expect(await page.evaluate(cssVar('--color-primary'))).toBe('#481a54');
  expect(await page.evaluate(cssVar('--color-accent'))).toBe('#730394');
  expect(await page.evaluate(cssVar('--space-4'))).not.toBe('');
  expect(await page.evaluate(cssVar('--font-size-md'))).not.toBe('');
  const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(bodyFont).toContain('Salesforce-Sans');
});
