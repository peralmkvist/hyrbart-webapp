import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { loadAuthenticatedFixture, type FixtureSession } from './auth-fixture';

const fixture = loadAuthenticatedFixture();

async function authenticatedContext(browser: Browser, session: FixtureSession) {
  const context = await browser.newContext();
  const headers = process.env.E2E_OIDC_TOKEN
    ? { 'x-hyrbart-github-oidc': process.env.E2E_OIDC_TOKEN }
    : undefined;
  const response = await context.request.post('/api/internal/e2e-session', {
    headers,
    data: { accessToken: session.access_token, refreshToken: session.refresh_token },
  });
  expect(response.status()).toBe(200);
  return context;
}

async function expectNoBlockingA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = results.violations.filter((violation) =>
    violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
}

test.describe('authenticated accessibility gate', () => {
  let renter: BrowserContext;
  let owner: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    renter = await authenticatedContext(browser, fixture.users.renter.session);
    owner = await authenticatedContext(browser, fixture.users.owner.session);
  });

  test.afterAll(async () => {
    await renter?.close();
    await owner?.close();
  });

  test('host profile and renter booking have no serious or critical axe violations', async () => {
    const hostPage = await owner.newPage();
    await hostPage.goto('/sv/vard/profil', { waitUntil: 'domcontentloaded' });
    await expect(hostPage.getByRole('heading', { name: 'Profil' })).toBeVisible();
    await expectNoBlockingA11yViolations(hostPage);
    await hostPage.close();

    const bookingPage = await renter.newPage();
    await bookingPage.goto(`/sv/bokningar/${fixture.bookings.lifecycle}`, { waitUntil: 'domcontentloaded' });
    await expect(bookingPage.getByRole('heading', { name: 'Bokning' })).toBeVisible();
    await expectNoBlockingA11yViolations(bookingPage);
    await bookingPage.close();
  });

  test('verified-history dialog traps focus, closes with Escape and restores focus', async () => {
    const page = await owner.newPage();
    await page.goto('/sv/vard/profil', { waitUntil: 'domcontentloaded' });

    const trigger = page.getByRole('button', { name: 'Ta med verifierad historik från annan plattform' });
    await expect(trigger).toBeEnabled();
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await trigger.press('Enter');

    const dialog = page.getByRole('dialog', { name: 'Ta med din historik' });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('button', { name: 'Stäng' })).toBeFocused();
    await expectNoBlockingA11yViolations(page);

    const focusable = dialog.locator('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    const count = await focusable.count();
    expect(count).toBeGreaterThan(0);
    await focusable.nth(count - 1).focus();
    await page.keyboard.press('Tab');
    await expect(focusable.first()).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await page.close();
  });
});
