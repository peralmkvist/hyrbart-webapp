import { createHash, randomBytes } from 'node:crypto';

const BANKID_ACR = 'urn:grn:authn:se:bankid';
const TRANSACTION_TTL_SECONDS = 10 * 60;

export const IDURA_COOKIE_NAMES = {
  state: '__Secure-hyrbart-idura-state',
  nonce: '__Secure-hyrbart-idura-nonce',
  verifier: '__Secure-hyrbart-idura-verifier',
} as const;

export const IDURA_TRANSACTION_TTL_SECONDS = TRANSACTION_TTL_SECONDS;
export const IDURA_BANKID_ACR = BANKID_ACR;

type DiscoveryDocument = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  token_endpoint_auth_methods_supported?: string[];
  id_token_signing_alg_values_supported?: string[];
};

type TokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type JwtHeader = {
  alg?: string;
  kid?: string;
  typ?: string;
};

export type IduraClaims = {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat?: number;
  nonce?: string;
  acr?: string;
  auth_time?: number;
  [key: string]: unknown;
};

type Jwk = JsonWebKey & { kid?: string; alg?: string; use?: string };
type Jwks = { keys?: Jwk[] };

function requiredEnv(name: 'IDURA_DOMAIN' | 'IDURA_CLIENT_ID' | 'IDURA_CLIENT_SECRET') {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function getIduraConfig() {
  return {
    domain: requiredEnv('IDURA_DOMAIN'),
    clientId: requiredEnv('IDURA_CLIENT_ID'),
    clientSecret: requiredEnv('IDURA_CLIENT_SECRET'),
  };
}

export function randomUrlSafe(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function createPkceChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url');
}

export async function getDiscovery(): Promise<DiscoveryDocument> {
  const { domain } = getIduraConfig();
  const response = await fetch(`https://${domain}/.well-known/openid-configuration`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Idura discovery failed with HTTP ${response.status}.`);

  const discovery = (await response.json()) as Partial<DiscoveryDocument>;
  if (!discovery.issuer || !discovery.authorization_endpoint || !discovery.token_endpoint || !discovery.jwks_uri) {
    throw new Error('Idura discovery document is incomplete.');
  }
  return discovery as DiscoveryDocument;
}

export async function buildAuthorizationUrl(options: {
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}) {
  const { clientId } = getIduraConfig();
  const discovery = await getDiscovery();
  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', options.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid');
  url.searchParams.set('state', options.state);
  url.searchParams.set('nonce', options.nonce);
  url.searchParams.set('acr_values', BANKID_ACR);
  url.searchParams.set('code_challenge', options.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url;
}

function oauthBasicValue(clientId: string, clientSecret: string) {
  const encode = (value: string) => encodeURIComponent(value).replace(/%20/g, '+');
  return Buffer.from(`${encode(clientId)}:${encode(clientSecret)}`, 'utf8').toString('base64');
}

export async function exchangeAuthorizationCode(options: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}) {
  const { clientId, clientSecret } = getIduraConfig();
  const discovery = await getDiscovery();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: options.code,
    redirect_uri: options.redirectUri,
    code_verifier: options.codeVerifier,
  });

  const methods = discovery.token_endpoint_auth_methods_supported ?? ['client_secret_basic'];
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (methods.includes('client_secret_basic')) {
    headers.Authorization = `Basic ${oauthBasicValue(clientId, clientSecret)}`;
  } else if (methods.includes('client_secret_post')) {
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
  } else {
    throw new Error('Idura does not advertise a supported client-secret token authentication method.');
  }

  const response = await fetch(discovery.token_endpoint, {
    method: 'POST',
    headers,
    body,
    cache: 'no-store',
  });
  const payload = (await response.json()) as TokenResponse;
  if (!response.ok || payload.error) {
    const detail = payload.error_description || payload.error || `HTTP ${response.status}`;
    throw new Error(`Idura token exchange failed: ${detail}`);
  }
  if (!payload.id_token) throw new Error('Idura token response did not contain an id_token.');
  return { token: payload, discovery };
}

function decodeBase64UrlJson<T>(value: string): T {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
  } catch {
    throw new Error('Malformed JWT.');
  }
}

function audienceMatches(aud: string | string[] | undefined, clientId: string) {
  return typeof aud === 'string' ? aud === clientId : Array.isArray(aud) && aud.includes(clientId);
}

async function verifyRs256Signature(options: {
  signingInput: string;
  signature: string;
  jwk: Jwk;
}) {
  const key = await crypto.subtle.importKey(
    'jwk',
    options.jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  return crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    Buffer.from(options.signature, 'base64url'),
    new TextEncoder().encode(options.signingInput),
  );
}

export async function verifyIdToken(options: {
  idToken: string;
  discovery: DiscoveryDocument;
  expectedNonce: string;
}): Promise<IduraClaims> {
  const { clientId } = getIduraConfig();
  const segments = options.idToken.split('.');
  if (segments.length !== 3) throw new Error('Malformed Idura id_token.');

  const [encodedHeader, encodedPayload, encodedSignature] = segments;
  const header = decodeBase64UrlJson<JwtHeader>(encodedHeader);
  const claims = decodeBase64UrlJson<Partial<IduraClaims>>(encodedPayload);

  if (header.alg !== 'RS256') throw new Error(`Unsupported Idura id_token algorithm: ${header.alg || 'missing'}.`);
  if (!header.kid) throw new Error('Idura id_token is missing kid.');
  if (options.discovery.id_token_signing_alg_values_supported && !options.discovery.id_token_signing_alg_values_supported.includes('RS256')) {
    throw new Error('Idura discovery does not advertise RS256 for id_token signing.');
  }

  const jwksResponse = await fetch(options.discovery.jwks_uri, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!jwksResponse.ok) throw new Error(`Idura JWKS fetch failed with HTTP ${jwksResponse.status}.`);
  const jwks = (await jwksResponse.json()) as Jwks;
  const jwk = jwks.keys?.find((key) => key.kid === header.kid && (!key.alg || key.alg === 'RS256'));
  if (!jwk) throw new Error('No matching Idura signing key was found.');

  const validSignature = await verifyRs256Signature({
    signingInput: `${encodedHeader}.${encodedPayload}`,
    signature: encodedSignature,
    jwk,
  });
  if (!validSignature) throw new Error('Invalid Idura id_token signature.');

  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== options.discovery.issuer) throw new Error('Invalid Idura id_token issuer.');
  if (!audienceMatches(claims.aud, clientId)) throw new Error('Invalid Idura id_token audience.');
  if (typeof claims.exp !== 'number' || claims.exp <= now - 60) throw new Error('Expired Idura id_token.');
  if (typeof claims.iat === 'number' && claims.iat > now + 60) throw new Error('Idura id_token has an invalid issued-at time.');
  if (claims.nonce !== options.expectedNonce) throw new Error('Invalid Idura id_token nonce.');
  if (typeof claims.sub !== 'string' || !claims.sub) throw new Error('Idura id_token is missing subject.');

  return claims as IduraClaims;
}
