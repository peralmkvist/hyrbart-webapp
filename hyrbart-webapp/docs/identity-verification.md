# Identity verification / SCRUM-20

Status: integration-ready framework. No production identity provider is connected yet.

## Security model

- `profiles.identity_verification_status` is server-controlled. `anon` and `authenticated` have SELECT only on `profiles`; they do not have table UPDATE privileges.
- Verification attempts and events are server-only tables. Client roles have no grants or RLS policies that expose them.
- Only server code holding the Supabase secret key can write verification state.
- Production explicitly rejects the `mock` provider even if configuration is accidentally present.
- The mock endpoint is hidden with 404 unless the runtime is non-production and `IDENTITY_VERIFICATION_PROVIDER=mock`.
- Audit events are append-only.

## Canonical states

`unverified -> pending -> verified | failed | cancelled | review_required | revoked`

A retry creates a new attempt. Historical attempts/events remain in the audit trail.

## Provider adapter contract

The selected provider must supply, through server-to-server APIs and/or a signed webhook:

1. a provider attempt/reference id;
2. a terminal or pending result mapped to the canonical states;
3. an idempotent provider event id where webhooks are used;
4. a cryptographically verifiable callback/webhook signature according to that provider's own specification.

Provider-specific signature verification must be implemented before any production callback is allowed to call `applyTrustedProviderResult()`.

Do not invent a generic webhook signature format: BankID/IDV vendors differ, so this belongs in the concrete adapter.

## Data minimisation

Hyrbart's application database should retain only what is necessary to prove and operate verification:

- user id;
- Hyrbart attempt id;
- provider name;
- opaque provider attempt/reference id;
- verification status;
- timestamps;
- non-sensitive failure/review code;
- correlation id and idempotent provider event id.

Do **not** store in these tables or logs:

- Swedish personal identity number;
- BankID security/start codes;
- certificates, signatures or secrets;
- screenshots/scans of identity documents unless a separately reviewed product requirement explicitly requires them;
- raw provider request/response bodies;
- full provider webhook payloads.

## Retention and legal launch gate

Retention periods and GDPR lawful basis are intentionally **not hard-coded yet**. Before public launch, Legal/Privacy must approve:

- chosen provider and processor/subprocessor roles;
- DPA and data residency/transfers;
- lawful basis for identity verification for the relevant Hyrbart flows;
- exact retention period for attempts/events and deletion/anonymisation procedure;
- user-facing privacy notice and support/review process;
- whether verification is mandatory for renting, hosting, payouts, high-risk activity, or another defined threshold.

The engineering design supports deleting attempts with the user (FK cascade) while keeping only the minimum operational state required during account lifetime. Any different statutory retention requirement must be documented before launch.

## Mock/test mode

Set `IDENTITY_VERIFICATION_PROVIDER=mock` only in local/preview environments. Start through `/api/identity-verification`, then drive the owned attempt through `/api/internal/identity-verification-mock` with one of:

- `verified`
- `failed`
- `cancelled`
- `review_required`
- `revoked`
- `pending`

Production refuses the mock provider and hides the mock endpoint. A mock result must never be interpreted as BankID verification; `bankid_verified` is only true when a trusted provider name explicitly represents BankID.

## Launch checklist

- [ ] Provider selected and commercial/legal review complete.
- [ ] Provider adapter implements start flow.
- [ ] Provider callback/webhook signature verification implemented from official provider docs.
- [ ] Verified/failed/cancelled/review/revoked E2E tested in provider sandbox.
- [ ] Replay/idempotency test passed.
- [ ] No sensitive identity data visible in client, logs, analytics or support exports.
- [ ] Security page next-step copy reviewed.
- [ ] Retention and GDPR basis approved.
- [ ] Production mock configuration absent.
