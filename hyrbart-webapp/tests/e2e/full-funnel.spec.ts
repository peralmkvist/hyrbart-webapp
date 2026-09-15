import { expect, test, type Browser, type BrowserContext } from '@playwright/test';
import { loadAuthenticatedFixture, type FixtureSession } from './auth-fixture';

const fixture = loadAuthenticatedFixture();
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGElEQVR4nGP8f4aBJMBEmvJRDaMahpIGAK90AeujlIFeAAAAAElFTkSuQmCC', 'base64');

function isoDate(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

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

async function selectStableLeafCategory(page: import('@playwright/test').Page) {
  const picker = page.locator('.newListingCategoryPicker');
  const path = ['Bygg & verktyg', 'Borrmaskiner och skruvdragare', 'Borrmaskin'] as const;
  const finalPath = path.join(' › ');

  await expect(picker).toBeVisible({ timeout: 10_000 });
  await expect(picker.locator('select')).toHaveCount(1, { timeout: 10_000 });

  for (let depth = 0; depth < path.length; depth += 1) {
    const value = path[depth];

    // A server-rendered select can be visible just before React hydration attaches
    // its change handler. Require a state-driven effect (the next level, or the
    // final path) so a DOM-only selectOption can never be mistaken for success.
    await expect.poll(async () => {
      const selects = picker.locator('select');
      if (await selects.count() < depth + 1) return false;

      const select = selects.nth(depth);
      if (await select.locator(`option[value="${value}"]`).count() !== 1) return false;
      await select.selectOption(value);

      if (depth < path.length - 1) {
        return (await picker.locator('select').count()) >= depth + 2;
      }

      return (await picker.locator('.newListingCategoryPath').textContent()) === finalPath;
    }, {
      timeout: 10_000,
      intervals: [100, 250, 500, 1_000],
      message: `Category level ${depth + 1} should update hydrated React state.`,
    }).toBe(true);

    await expect(picker.locator('select').nth(depth)).toHaveValue(value);
  }

  await expect(picker.locator('.newListingCategoryPath')).toHaveText(finalPath, { timeout: 10_000 });
}

async function continueListing(page: import('@playwright/test').Page) {
  const button = page.getByRole('button', { name: /Fortsätt/ });
  await expect(button).toBeEnabled();
  await button.click();
}

test.describe('production full marketplace funnel', () => {
  // Successful listing mutations invalidate the shared Sanity product cache.
  // Keep a short poll window only for normal request/render propagation; a stale
  // 60-second cache must no longer be able to make this test pass eventually.
  test.describe.configure({ mode: 'serial', retries: 0, timeout: 210_000 });

  let owner: BrowserContext;
  let renter: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    owner = await authenticatedContext(browser, fixture.users.owner.session);
    renter = await authenticatedContext(browser, fixture.users.renter.session);
  });

  test.afterAll(async () => {
    await owner?.close();
    await renter?.close();
  });

  test('host publishes listing → renter finds it → starts booking', async () => {
    const uniqueName = `E2E Funnel ${fixture.runId}`;
    const from = isoDate(35);
    const to = isoDate(36);

    const hostPage = await owner.newPage();
    await hostPage.goto('/topsecret/sv/vard/annonser/ny', { waitUntil: 'domcontentloaded' });
    await expect(hostPage.getByRole('heading', { name: 'Vad vill du hyra ut?' })).toBeVisible();

    // Category selection now proves that React hydration is active. Fill the
    // controlled text inputs afterwards so hydration cannot replace their values.
    await selectStableLeafCategory(hostPage);

    const productType = hostPage.getByLabel('Produkttyp');
    const brand = hostPage.getByLabel('Varumärke');
    const productName = hostPage.getByLabel('Modell / produktnamn');
    await productType.fill('E2E testprodukt');
    await brand.fill('Hyrbart');
    await productName.fill(uniqueName);
    await expect(productType).toHaveValue('E2E testprodukt');
    await expect(brand).toHaveValue('Hyrbart');
    await expect(productName).toHaveValue(uniqueName);
    await continueListing(hostPage);

    await expect(hostPage.getByRole('heading', { name: 'Lägg till bilder' })).toBeVisible();
    await hostPage.locator('input[type="file"]').setInputFiles({ name: 'e2e-funnel.png', mimeType: 'image/png', buffer: tinyPng });
    await continueListing(hostPage);

    await hostPage.getByLabel('Produktbeskrivning').fill('Automatiserad full-funnel-annons som ska tas bort av E2E-cleanup.');
    await hostPage.getByLabel('Detta ingår').fill('E2E-produkt');
    await continueListing(hostPage);

    await hostPage.getByLabel('Pris per dygn').fill('123');
    await continueListing(hostPage);

    await expect(hostPage.getByRole('heading', { name: 'Välj avbokningsvillkor' })).toBeVisible();
    await continueListing(hostPage);

    await expect(hostPage.getByRole('heading', { name: 'Var hämtas den?' })).toBeVisible();
    await hostPage.getByLabel('Ort').fill('Test');
    await continueListing(hostPage);

    await expect(hostPage.getByRole('heading', { name: 'Tillgänglighet' })).toBeVisible();
    await continueListing(hostPage);

    await expect(hostPage.getByRole('heading', { name: 'Förhandsgranska annonsen' })).toBeVisible();
    const listingResponsePromise = hostPage.waitForResponse(response =>
      new URL(response.url()).pathname === '/api/listings' && response.request().method() === 'POST',
    );
    await hostPage.getByRole('button', { name: 'Publicera annons' }).click();
    const listingResponse = await listingResponsePromise;
    expect(listingResponse.status()).toBe(200);
    const listing = await listingResponse.json() as { slug?: string; id?: string; status?: string };
    expect(listing.slug).toBeTruthy();
    expect(listing.id).toBeTruthy();
    expect(listing.status).toBe('active');
    await hostPage.close();

    const renterPage = await renter.newPage();
    const searchUrl = `/sv/produkter?q=${encodeURIComponent(uniqueName)}&from=${from}&to=${to}`;
    const result = renterPage.getByRole('link').filter({ hasText: uniqueName }).first();

    await expect.poll(async () => {
      await renterPage.goto(searchUrl, { waitUntil: 'domcontentloaded' });
      return result.count();
    }, {
      timeout: 30_000,
      intervals: [1_000, 2_000, 3_000, 5_000],
      message: 'Published E2E listing should become visible promptly after the Sanity product cache is invalidated.',
    }).toBeGreaterThan(0);

    await expect(result).toBeVisible();
    const resultHref = await result.getAttribute('href');
    expect(resultHref).toBeTruthy();
    expect(resultHref).toContain(String(listing.slug));
    await result.click();
    await expect(renterPage).toHaveURL(new RegExp(`/${String(listing.slug).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\?|$)`), { timeout: 20_000 });

    // The detail route intentionally renders a loading skeleton while its client
    // data resolves. Wait for that explicit state to clear instead of racing the
    // default 5-second assertion against a valid intermediate UI.
    await expect(renterPage.getByRole('status', { name: 'Laddar' })).toBeHidden({ timeout: 20_000 });
    await expect(renterPage.getByText(uniqueName, { exact: true })).toBeVisible({ timeout: 20_000 });

    const bookingButton = renterPage.getByRole('button', { name: 'Skicka bokningsförfrågan' });
    await expect(bookingButton).toBeEnabled({ timeout: 20_000 });
    const bookingResponsePromise = renterPage.waitForResponse(response =>
      new URL(response.url()).pathname === '/api/booking-request-safe' && response.request().method() === 'POST',
    );
    await bookingButton.click();
    const bookingResponse = await bookingResponsePromise;
    expect(bookingResponse.status()).toBe(200);
    const booking = await bookingResponse.json() as { bookingId?: string; status?: string };
    expect(booking.bookingId).toBeTruthy();
    expect(booking.status).toBe('requested');

    await expect(renterPage).toHaveURL(new RegExp(`/bokningar/${booking.bookingId}$`), { timeout: 20_000 });
    await expect(renterPage.getByText('Förfrågan skickad')).toBeVisible();
    await renterPage.close();
  });
});
