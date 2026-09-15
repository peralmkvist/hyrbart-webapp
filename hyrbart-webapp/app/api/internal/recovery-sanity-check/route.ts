import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SANITY_PROJECT_ID = 'ew1i5o0v';
const SANITY_DATASET = 'production';
const SANITY_API_VERSION = '2026-09-08';
const RECOVERY_BRANCH = 'recovery/sanity-rebuild-2026-09-15';

function isRecoveryPreview() {
  return process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF === RECOVERY_BRANCH;
}

async function mutate(token: string, mutations: unknown[]) {
  const response = await fetch(
    `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/mutate/${SANITY_DATASET}?returnIds=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mutations }),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw new Error(`Sanity mutation failed (${response.status}): ${await response.text()}`);
  }
}

export async function GET() {
  if (!isRecoveryPreview()) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: false, error: 'WRITE_TOKEN_MISSING' }, { status: 503 });
  }

  const id = `drafts.recovery-token-check-${crypto.randomUUID()}`;
  let created = false;
  let cleaned = false;

  try {
    await mutate(token, [
      {
        create: {
          _id: id,
          _type: 'recoveryTokenCheck',
          createdAt: new Date().toISOString(),
        },
      },
    ]);
    created = true;

    await mutate(token, [{ delete: { id } }]);
    cleaned = true;

    return NextResponse.json(
      {
        ok: true,
        projectId: SANITY_PROJECT_ID,
        dataset: SANITY_DATASET,
        created,
        cleaned,
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    if (created && !cleaned) {
      try {
        await mutate(token, [{ delete: { id } }]);
        cleaned = true;
      } catch {
        // Keep the original failure as the diagnostic result.
      }
    }

    console.error('Recovery Sanity write-token check failed', error);
    return NextResponse.json(
      {
        ok: false,
        projectId: SANITY_PROJECT_ID,
        dataset: SANITY_DATASET,
        created,
        cleaned,
        error: error instanceof Error ? error.message.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]') : 'UNKNOWN_ERROR',
      },
      { status: 500, headers: { 'cache-control': 'no-store' } },
    );
  }
}
