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
  const path = [
    { label: 'Huvudkategori', value: 'Verktyg' },
    { label: 'Underkategori', value: 'Elverktyg' },
    { label: 'Detaljkategori', value: 'Borrmaskin' },
  ] as const;

  for (const { label, value } of path) {
    const select = page.getByLabel(label, { exact: true });
    await expect(select).toBeVisible({ timeout: 10_000 });
    await expect(select.locator(`option[value="${value}"]`)).toHaveCount(1, { timeout: 10_000 });
    await select.selectOption(value);
    await expect(select).toHaveValue(value);
  }

  await expect(page.getByText('Verktyg › Elverktyg › Borrmaskin', { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: /Fortsätt/ })).toBeEnabled({ timeout: 10_000 });
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

    await hostPage.getByLabel('Produkttyp').fill('E2E testprodukt');
    await hostPage.getByLabel('Varumärke').fill('Hyrbart');
    await hostPage.getByLabel('Modell / produktnamn').fill(uniqueName);
    await selectStableLeafCategory(hostPage);
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
    await result.click();
    await expect(renterPage.getByText(uniqueName, { exact: true })).toBeVisible();

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
