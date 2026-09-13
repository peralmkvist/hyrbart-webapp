import { expect, test, type Browser, type BrowserContext, type APIResponse } from '@playwright/test';
import { loadAuthenticatedFixture, oidcToken, type FixtureSession } from './auth-fixture';

const fixture = loadAuthenticatedFixture();
const oidc = oidcToken();
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=', 'base64');

async function json(response: APIResponse) {
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function authenticatedContext(browser: Browser, session: FixtureSession) {
  const context = await browser.newContext();
  const response = await context.request.post('/api/internal/e2e-session', {
    headers: { 'x-hyrbart-github-oidc': oidc },
    data: { accessToken: session.access_token, refreshToken: session.refresh_token },
  });
  expect(response.status()).toBe(200);
  return context;
}

async function setStatus(context: BrowserContext, bookingId: string, status: string) {
  return json(await context.request.post(`/api/bookings/${bookingId}/status`, { data: { status } }));
}

async function pay(context: BrowserContext, bookingId: string) {
  return json(await context.request.post(`/api/bookings/${bookingId}/pay`));
}

async function conditionPhoto(context: BrowserContext, bookingId: string, stage: 'pickup' | 'return') {
  return json(await context.request.post(`/api/bookings/${bookingId}/condition-photos`, {
    multipart: {
      stage,
      file: { name: `${stage}.png`, mimeType: 'image/png', buffer: tinyPng },
    },
  }));
}

async function acceptAndPay(owner: BrowserContext, renter: BrowserContext, bookingId: string) {
  const accepted = await setStatus(owner, bookingId, 'accepted');
  expect(accepted.response.status()).toBe(200);
  expect(accepted.body.status).toBe('accepted');

  const paid = await pay(renter, bookingId);
  expect(paid.response.status()).toBe(200);
  expect(paid.body.status).toBe('paid');
  expect(paid.body.simulated).toBe(true);
  return paid.body;
}

test.describe('production authenticated booking lifecycle', () => {
  test.describe.configure({ mode: 'serial' });

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

  test('request → accept → pay → pickup → return → complete → double-blind reviews', async () => {
    const id = fixture.bookings.lifecycle;

    const forbiddenOwnerPay = await pay(owner, id);
    expect(forbiddenOwnerPay.response.status()).toBe(403);

    await acceptAndPay(owner, renter, id);

    const pickup = await conditionPhoto(renter, id, 'pickup');
    expect(pickup.response.status()).toBe(200);
    expect(pickup.body.status).toBe('active');

    const returned = await conditionPhoto(renter, id, 'return');
    expect(returned.response.status()).toBe(200);
    expect(returned.body.status).toBe('returned');

    const completed = await setStatus(owner, id, 'completed');
    expect(completed.response.status()).toBe(200);
    expect(completed.body.status).toBe('completed');
    expect(completed.body.completedAt).toBeTruthy();

    const renterReview = await renter.request.post(`/api/bookings/${id}/reviews`, {
      data: {
        communication: 5,
        overall_rating: 5,
        condition_rating: 5,
        function_rating: 5,
        communication_tags: ['Tydlig kommunikation'],
        condition_tags: ['Som beskriven'],
        function_tags: ['Fungerade bra'],
        recommend_person: true,
        recommend_product: true,
        comment: 'Smidig och tydlig uthyrning.',
      },
    });
    expect(renterReview.status()).toBe(200);

    const beforeReveal = await json(await renter.request.get(`/api/bookings/${id}/reviews`));
    expect(beforeReveal.response.status()).toBe(200);
    expect(beforeReveal.body.submitted).toBe(true);
    expect(beforeReveal.body.counterpartSubmitted).toBe(false);
    expect(beforeReveal.body.revealed).toHaveLength(0);

    const ownerReview = await owner.request.post(`/api/bookings/${id}/reviews`, {
      data: {
        communication: 5,
        overall_rating: 5,
        handover_rating: 5,
        return_condition_rating: 5,
        communication_tags: ['Tydlig kommunikation'],
        handover_tags: ['Smidig överlämning'],
        return_condition_tags: ['Bra skick'],
        recommend_person: true,
        comment: 'Allt fungerade mycket bra.',
      },
    });
    expect(ownerReview.status()).toBe(200);

    const revealed = await json(await renter.request.get(`/api/bookings/${id}/reviews`));
    expect(revealed.response.status()).toBe(200);
    expect(revealed.body.counterpartSubmitted).toBe(true);
    expect(revealed.body.revealed).toHaveLength(2);
  });

  test('paid cancellation produces a simulated refund', async () => {
    const id = fixture.bookings.cancellation;
    await acceptAndPay(owner, renter, id);

    const cancelled = await json(await renter.request.post(`/api/bookings/${id}/cancel`, {
      data: { reason: 'Planerna ändrades', details: '' },
    }));
    expect(cancelled.response.status()).toBe(200);
    expect(cancelled.body.status).toBe('refunded');
    expect(cancelled.body.refundAmount).toBeGreaterThan(0);
    expect(cancelled.body.refundSimulated).toBe(true);
  });

  test('opening a dispute is atomic and duplicate-safe', async () => {
    const id = fixture.bookings.dispute;
    await acceptAndPay(owner, renter, id);

    const first = await json(await renter.request.post(`/api/bookings/${id}/cases`, {
      data: {
        case_type: 'dispute',
        reason: 'E2E tvist',
        description: 'Automatiserat test av tvistflödet.',
        amount_claimed: 250,
      },
    }));
    expect(first.response.status()).toBe(200);
    expect(first.body.status).toBe('disputed');
    expect(first.body.case.id).toBeTruthy();

    const duplicate = await renter.request.post(`/api/bookings/${id}/cases`, {
      data: {
        case_type: 'dispute',
        reason: 'E2E tvist igen',
        description: 'Samma typ ska inte kunna öppnas två gånger.',
        amount_claimed: 250,
      },
    });
    expect(duplicate.status()).toBe(409);
  });

  test('concurrent payment requests remain idempotent', async () => {
    const id = fixture.bookings.race;
    const accepted = await setStatus(owner, id, 'accepted');
    expect(accepted.response.status()).toBe(200);

    const [a, b] = await Promise.all([pay(renter, id), pay(renter, id)]);
    expect(a.response.status()).toBe(200);
    expect(b.response.status()).toBe(200);
    expect(a.body.status).toBe('paid');
    expect(b.body.status).toBe('paid');
    expect(a.body.paymentId).toBeTruthy();
    expect(a.body.paymentId).toBe(b.body.paymentId);
    expect([a.body.idempotent, b.body.idempotent]).toContain(true);
  });
});
