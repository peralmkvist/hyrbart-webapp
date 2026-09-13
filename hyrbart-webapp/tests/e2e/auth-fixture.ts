import fs from 'node:fs';

export type FixtureSession = {
  access_token: string;
  refresh_token: string;
};

export type AuthenticatedFixture = {
  runId: string;
  users: {
    renter: { id: string; email: string; session: FixtureSession };
    owner: { id: string; email: string; session: FixtureSession };
  };
  bookings: {
    lifecycle: string;
    cancellation: string;
    dispute: string;
    race: string;
  };
  supabaseUrl: string;
  publishableKey: string;
};

export function loadAuthenticatedFixture(): AuthenticatedFixture {
  const path = process.env.E2E_FIXTURE_PATH;
  if (!path) throw new Error('E2E_FIXTURE_PATH is required for authenticated E2E tests.');
  return JSON.parse(fs.readFileSync(path, 'utf8')) as AuthenticatedFixture;
}

export function oidcToken() {
  const token = process.env.E2E_OIDC_TOKEN;
  if (!token) throw new Error('E2E_OIDC_TOKEN is required for production authenticated E2E tests.');
  return token;
}
