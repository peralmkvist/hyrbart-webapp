import { expect, test, type Page } from '@playwright/test';

type Session = { access_token: string; refresh_token: string };
type Role = 'renter' | 'owner';
type Fixture = {
  runId: string;
  users: Record<Role, { id: string; email: string; session: Session }>;
  bookings: {
    lifecycle: string;
    cancellation: string;
    dispute: string;
    race: string;
  };
};

const encoded = process.env.E2E_FIXTURE_B64;
const fixture: Fixture | null = encoded
  ? JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as Fixture
  : null;

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1C0AAAAASUVORK5CYII=',
  'base64',
);

async function useRole(page: Page, role: Role) {
  if (!fixture) throw new Error('Authenticated E2E fixture is missing.');
  const session = fixture.users[role].session;
  const response = await page.request.post('/api/internal/e2e-session', {
    data: { accessToken: session.access_token, refreshToken: session.refresh_token },
  });
  expect(response.status(), `session bootstrap for ${role}`).toBe(200);
  const body = await response.json();
  expect(body.userId).toBe(fixture.users[role].id);
}

async function accept(page: Page, bookingId: string) {
  await useRole(page, 'owner');
  const response = await page.request.post(`/api/bookings/${bookingId}/status`, {
    data: { status: 'accepted' },
  });
  expect(response.status()).toBe(200);
  expect((await response.json()).status).toBe('accepted');
}

async function pay(page: Page, bookingId: string) {
  await useRole(page, 'renter');
  const response = await page.request.post(`/api/bookings/${bookingId}/pay`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.status).toBe('paid');
  expect(body.paymentId).toBeTruthy();
  return body;
}

async function conditionPhoto(page: Page, bookingId: string, stage: 'pickup' | 'return') {
  await useRole(page, 'renter');
  const response = await page.request.post(`/api/bookings/${bookingId}/condition-photos`, {
    multipart: {
      stage,
      file: {
        name: `${stage}.png`,
        mimeType: 'image/png',
        buffer: tinyPng,
      },
    },
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.status).toBe(stage === 'pickup' ? 'active' : 'returned');
  expect(body.photo?.id).toBeTruthy();
  return body;
}

test.describe.serial('authenticated booking lifecycle', () => {
  test.skip(!fixture, 'Requires OIDC-seeded authenticated E2E fixture.');

  test('request → accept → pay → pickup → return → complete → double-blind reviews', async ({ page }) => {
    const bookingId = fixture!.bookings.lifecycle;

    await accept(page, bookingId);
    await pay(page, bookingId);
    await conditionPhoto(page, bookingId, 'pickup');
    await conditionPhoto(page, bookingId, 'return');

    await useRole(page, 'owner');
    const complete = await page.request.post(`/api/bookings/${bookingId}/status`, {
      data: { status: 'completed' },
    });
    expect(complete.status()).toBe(200);
    const completed = await complete.json();
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBeTruthy();

    await useRole(page, 'renter');
    const renterReview = await page.request.post(`/api/bookings/${bookingId}/reviews`, {
      data: {
        communication: 5,
        overall_rating: 5,
        condition_rating: 5,
        function_rating: 5,
        recommend_person: true,
        recommend_product: true,
        comment: 'E2E renter review',
      },
    });
    expect(renterReview.status()).toBe(200);

    const hiddenUntilCounterpart = await page.request.get(`/api/bookings/${bookingId}/reviews`);
    expect(hiddenUntilCounterpart.status()).toBe(200);
    const hiddenBody = await hiddenUntilCounterpart.json();
    expect(hiddenBody.submitted).toBe(true);
    expect(hiddenBody.counterpartSubmitted).toBe(false);
    expect(hiddenBody.revealed).toHaveLength(0);

    await useRole(page, 'owner');
    const ownerReview = await page.request.post(`/api/bookings/${bookingId}/reviews`, {
      data: {
        communication: 5,
        overall_rating: 5,
        handover_rating: 5,
        return_condition_rating: 5,
        recommend_person: true,
        comment: 'E2E owner review',
      },
    });
    expect(ownerReview.status()).toBe(200);

    await useRole(page, 'renter');
    const revealed = await page.request.get(`/api/bookings/${bookingId}/reviews`);
    expect(revealed.status()).toBe(200);
    const revealedBody = await revealed.json();
    expect(revealedBody.counterpartSubmitted).toBe(true);
    expect(revealedBody.revealed).toHaveLength(2);
  });

  test('paid booking cancellation records a simulated refund', async ({ page }) => {
    const bookingId = fixture!.bookings.cancellation;
    await accept(page, bookingId);
    await pay(page, bookingId);

    await useRole(page, 'renter');
    const response = await page.request.post(`/api/bookings/${bookingId}/cancel`, {
      data: { reason: 'Planerna ändrades', details: '' },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('refunded');
    expect(body.refundAmount).toBeGreaterThan(0);
    expect(body.paymentId).toBeTruthy();
    expect(body.refundSimulated).toBe(true);
  });

  test('duplicate dispute race creates exactly one open case', async ({ page }) => {
    const bookingId = fixture!.bookings.dispute;
    await accept(page, bookingId);
    await pay(page, bookingId);
    await useRole(page, 'renter');

    const payload = {
      case_type: 'dispute',
      reason: 'E2E disputed handover',
      description: 'Concurrent E2E dispute creation must be atomic.',
      amount_claimed: 250,
    };
    const [first, second] = await Promise.all([
      page.request.post(`/api/bookings/${bookingId}/cases`, { data: payload }),
      page.request.post(`/api/bookings/${bookingId}/cases`, { data: payload }),
    ]);
    const outcomes = [first, second].sort((a, b) => a.status() - b.status());
    expect(outcomes.map(item => item.status())).toEqual([200, 409]);
    const successBody = await outcomes[0].json();
    const conflictBody = await outcomes[1].json();
    expect(successBody.status).toBe('disputed');
    expect(successBody.case?.id).toBeTruthy();
    expect(conflictBody.error).toBe('CASE_ALREADY_OPEN');
  });

  test('concurrent payment capture is idempotent', async ({ page }) => {
    const bookingId = fixture!.bookings.race;
    await accept(page, bookingId);
    await useRole(page, 'renter');

    const [first, second] = await Promise.all([
      page.request.post(`/api/bookings/${bookingId}/pay`),
      page.request.post(`/api/bookings/${bookingId}/pay`),
    ]);
    expect(first.status()).toBe(200);
    expect(second.status()).toBe(200);
    const bodies = await Promise.all([first.json(), second.json()]);
    expect(bodies[0].paymentId).toBeTruthy();
    expect(bodies[0].paymentId).toBe(bodies[1].paymentId);
    expect(bodies.some(body => body.idempotent === true)).toBe(true);
  });
});
