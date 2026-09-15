import { expect, test } from '@playwright/test';
import { loadAuthenticatedFixture } from './auth-fixture';

const fixture = loadAuthenticatedFixture();

test.describe('authenticated local quality gate', () => {
  test('rejects unauthenticated notification preferences', async ({ browser }) => {
    const context = await browser.newContext();
    const response = await context.request.get('/api/notifications/preferences');
    expect(response.status()).toBe(401);
    await context.close();
  });

  for (const role of ['renter', 'owner'] as const) {
    test(`${role} session is accepted and can read own preferences`, async ({ browser }) => {
      const context = await browser.newContext();
      const user = fixture.users[role];
      const bootstrap = await context.request.post('/api/internal/e2e-session', {
        data: {
          accessToken: user.session.access_token,
          refreshToken: user.session.refresh_token,
        },
      });
      expect(bootstrap.status()).toBe(200);
      expect((await bootstrap.json()).userId).toBe(user.id);

      const preferences = await context.request.get('/api/notifications/preferences');
      expect(preferences.status()).toBe(200);
      const body = await preferences.json();

      expect(Array.isArray(body.preferences)).toBe(true);
      expect(body.preferences).toHaveLength(8);
      expect(body.preferences.map((preference: { type: string }) => preference.type)).toEqual(
        expect.arrayContaining([
          'follower',
          'booking',
          'booking_update',
          'message',
          'followed_host_listing',
          'favorite_price_change',
          'search_alert',
          'pickup_return_reminder',
        ]),
      );

      const bookingPreference = body.preferences.find(
        (preference: { type: string }) => preference.type === 'booking',
      );
      expect(bookingPreference).toMatchObject({
        type: 'booking',
        in_app: true,
        push: true,
        email: true,
        sms: false,
        mandatoryInApp: true,
        classification: 'transactional',
        priority: 'critical',
        digest: 'none',
      });
      expect(body.channels).toMatchObject({
        push: { available: true },
        email: { available: true },
        sms: { active: false },
      });
      await context.close();
    });
  }
});
