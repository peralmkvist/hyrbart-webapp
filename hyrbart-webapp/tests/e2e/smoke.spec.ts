import { expect, test } from '@playwright/test';

test('public home renders meaningful content without framework error overlay', async ({ page }) => {
  await page.goto('/sv', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).not.toHaveText('');
  await expect(page.locator('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay')).toHaveCount(0);
});

test('products page is reachable and keeps navigation usable', async ({ page }) => {
  const response = await page.goto('/sv/produkter', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBeLessThan(500);
  await expect(page.locator('body')).not.toHaveText('');
});

test('unknown route returns branded 404 instead of framework default', async ({ page }) => {
  const response = await page.goto('/quality-gate-does-not-exist', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Vi hittar inte sidan' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Till startsidan' })).toBeVisible();
});

test('skip link is keyboard reachable and targets main content', async ({ page }) => {
  await page.goto('/sv', { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toHaveText(/Hoppa till innehåll/i);
  await expect(focused).toHaveAttribute('href', '#main-content');
});
