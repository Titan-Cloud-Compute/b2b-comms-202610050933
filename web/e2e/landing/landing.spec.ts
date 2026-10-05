import { test, expect } from '@playwright/test';
import { mockApi } from '../spec/_support';

test.use({ serviceWorkers: 'block' });

test('landing page renders card copy, highlights and role CTAs', async ({ page }) => {
  await mockApi(page);
  await page.goto('/#/');
  const landing = page.getByTestId('landing-page');
  await expect(landing).toBeVisible();
  await expect(landing.locator('h1')).toHaveText('B2B Vendor & Customer Workspace Portal');
  await expect(page.locator('body')).toContainText('Streamline onboarding, communications, and invoicing between vendors and customers in one place.');

  await expect(page.getByTestId('landing-highlight-0')).toContainText('Shared channels for real-time vendor-customer communication');
  await expect(page.getByTestId('landing-highlight-1')).toContainText('Integrated invoice management and approval workflows');
  await expect(page.getByTestId('landing-highlight-2')).toContainText('Role-based access for admins, vendors, and customers');

  await expect(page.getByTestId('landing-cta-admin')).toHaveAttribute('href', '#/dashboard');
  await expect(page.getByTestId('landing-cta-vendor')).toHaveAttribute('href', '#/orders');
  await expect(page.getByTestId('landing-cta-customer')).toHaveAttribute('href', '#/invoices');
  await expect(page.getByTestId('landing-cta-admin')).toHaveText('Get Started');
  await expect(page.getByTestId('landing-cta-vendor')).toHaveText('View Orders');
  await expect(page.getByTestId('landing-cta-customer')).toHaveText('Track Invoices');

  await expect(page.locator('body')).not.toContainText('Enterprise Platform');
  await expect(page.locator('body')).not.toContainText('A modern platform for your organization.');
});
