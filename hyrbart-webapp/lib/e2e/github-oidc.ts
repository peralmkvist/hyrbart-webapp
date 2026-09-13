import 'server-only';

const ISSUER = 'https://token.actions.githubusercontent.com';
const JWKS_URL = `${ISSUER}/.well-known/jwks`;
const AUDIENCE = 'hyrbart-e2e';
const REPOSITORY = 'peralmkvist/hyrbart-webapp';
const WORKFLOW_PREFIX = `${REPOSITORY}/.github/workflows/quality-gate.yml@`;

type GithubOidcClaims = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  repository?: string;
  event_name?: string;
  ref?: string;
  sha?: string;
  workflow_ref?: string;
  actor?: string;
};

type Jwk = JsonWebKey & { kid?: string; alg?: string; use?: string };

let cachedJwks: { expiresAt: number; keys: Jwk[] } | null = null;

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64');
}

function decodeJson<T>(value: string): T {
  return JSON.parse(decodeBase64Url(value).toString('utf8')) as T;
}

function audienceMatches(aud: GithubOidcClaims['aud']) {
  if (Array.isArray(aud)) return aud.includes(AUDIENCE);
  return aud === AUDIENCE;
}

async function getJwks() {
  if (cachedJwks && cachedJwks.expiresAt > Date.now()) return cachedJwks.keys;
  const response = await fetch(JWKS_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error(`GitHub OIDC JWKS fetch failed: ${response.status}`);
  const body = await response.json() as { keys?: Jwk[] };
  if (!Array.isArray(body.keys) || body.keys.length === 0) throw new Error('GitHub OIDC JWKS is empty.');
  cachedJwks = { keys: body.keys, expiresAt: Date.now() + 60 * 60 * 1000 };
  return body.keys;
}

export async function verifyGithubActionsOidcToken(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed OIDC token.');

  const header = decodeJson<{ alg?: string; kid?: string }>(parts[0]);
  const claims = decodeJson<GithubOidcClaims>(parts[1]);
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unsupported OIDC token header.');

  const jwks = await getJwks();
  const jwk = jwks.find(item => item.kid === header.kid);
  if (!jwk) throw new Error('OIDC signing key not found.');

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    decodeBase64Url(parts[2]),
    Buffer.from(`${parts[0]}.${parts[1]}`),
  );
  if (!valid) throw new Error('Invalid OIDC token signature.');

  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== ISSUER) throw new Error('Unexpected OIDC issuer.');
  if (!audienceMatches(claims.aud)) throw new Error('Unexpected OIDC audience.');
  if (!claims.exp || claims.exp < now - 30) throw new Error('Expired OIDC token.');
  if (claims.nbf && claims.nbf > now + 30) throw new Error('OIDC token is not active yet.');
  if (claims.repository !== REPOSITORY) throw new Error('Unexpected OIDC repository.');
  if (!String(claims.workflow_ref || '').startsWith(WORKFLOW_PREFIX)) throw new Error('Unexpected OIDC workflow.');
  if (!['pull_request', 'push'].includes(String(claims.event_name || ''))) throw new Error('Unexpected OIDC event.');
  if (claims.event_name === 'pull_request' && !String(claims.ref || '').startsWith('refs/pull/')) throw new Error('Unexpected pull request ref.');
  if (claims.event_name === 'push' && claims.ref !== 'refs/heads/main') throw new Error('Unexpected push ref.');

  return claims;
}

export async function requireGithubActionsOidc(request: Request) {
  const dedicated = request.headers.get('x-hyrbart-github-oidc');
  if (dedicated) return verifyGithubActionsOidcToken(dedicated);

  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error('Missing GitHub Actions OIDC token.');
  return verifyGithubActionsOidcToken(match[1]);
}
