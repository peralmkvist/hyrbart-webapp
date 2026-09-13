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
      expect(body.preferences).toMatchObject({
        push_enabled: true,
        email_enabled: true,
        reminder_enabled: true,
        review_enabled: true,
      });
      await context.close();
    });
  }
});
