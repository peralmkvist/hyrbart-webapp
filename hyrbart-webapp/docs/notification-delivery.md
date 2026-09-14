# Notification delivery – launch underlag

Status: implementation for SCRUM-56, 14 September 2026.

## Scope

This document describes the production delivery path for Hyrbart transactional notifications outside the app. The current production provider for email is Resend. Push is handled separately. SMS preferences exist in the product model but no SMS provider is active yet.

## Email delivery flow

1. A domain event creates a `user_notifications` row with a stable `event_key`.
2. Channel preferences and the centralized notification policy decide whether email is enabled.
3. Privacy-safe external copy is produced before sending. Free-form booking messages and case/dispute text are never copied into email or lock-screen previews.
4. Email is submitted to Resend using the verified `hyrbart.se` domain.
5. The Resend email ID is stored in `user_notifications.email_provider_id`.
6. The local state `sent` means Resend accepted the API request; it does not mean inbox delivery is proven.
7. Final provider outcomes such as delivered or bounced are currently verified in Resend. Hyrbart does not poll these outcomes because the production Resend key is intentionally scoped for sending and returned 401 for read/status lookup. A future signed webhook is the preferred way to ingest final provider outcomes without broadening the send credential.

## Delivery states currently enforced by Hyrbart

- `pending` – not yet attempted.
- `sent` – accepted by Resend; provider ID persisted.
- `failed` – API/request-level failure eligible for retry, max 3 delivery attempts.
- `skipped` – channel disabled, provider unavailable, no destination, frequency limit or event-specific suppression.

Schema fields for final provider evidence (`email_last_event`, `email_delivered_at`, `email_terminal_failed_at`) are present for later signed-webhook ingestion, but Hyrbart does not currently claim those fields are automatically synchronized.

## Retry and duplicate protection

- Stable `event_key` prevents duplicate notification rows.
- Resend requests use an idempotency key derived from the notification event key/ID.
- Application-level failures are retried by notification maintenance up to three attempts.
- A successful retry stores the new Resend provider ID.
- Provider-level bounces/suppressions are visible in Resend and are not automatically retried by Hyrbart.

## Provider and domain verification

- `hyrbart.se` is verified in Resend.
- Sending is enabled in EU region (`eu-west-1`).
- Existing Hyrbart transactional E2E emails have been observed in Resend with both delivered and bounced outcomes.

## Acceptance test for SCRUM-56

Production test completed on 14 September 2026:

1. A synthetic Hyrbart notification was inserted with local `email_status=failed`.
2. The ordinary five-minute production maintenance worker picked it up through the real retry path.
3. Hyrbart changed it to `sent`, incremented `email_attempts` to 1 and persisted Resend provider ID `6a61d4fe-2c46-4e04-86ab-49380e50a0e7`.
4. Resend reported that exact email as `delivered` to the real account recipient.
5. A historical Hyrbart E2E email with provider ID `4451d779-c87f-4f9e-ab3a-4f6ddd44e5ab` was verified in Resend as `bounced`, proving the provider failure log is available and distinguishes final delivery failure from API acceptance.
6. An attempted provider-status polling implementation was deliberately disabled after production proved the scoped send key returns HTTP 401 for read/status lookup. No broader Resend credential was introduced merely to make the test pass.

Synthetic test database rows are removed after verification.

## SMS

The notification matrix and user preference UI support SMS as a channel, but SMS delivery is intentionally inactive until an SMS provider, sender identity, phone-number verification model, cost controls and delivery/failure handling are selected and implemented. SCRUM-56 satisfies its original acceptance criterion with verified email delivery (the Jira requirement is email **or** SMS), but SMS must not be represented as production-ready until that provider work exists.

## Launch gates / later improvement

Before public launch or when provider telemetry is brought into Hyrbart itself:

- add a signed Resend webhook for `email.delivered`, `email.bounced`, `email.failed`, `email.suppressed` and `email.complained` rather than broadening the send-only API key;
- verify a real user can opt email on/off for an optional notification and that delivery follows the choice;
- verify transactional in-app notifications remain present when an external channel is disabled;
- monitor bounce/suppression rates and investigate abnormal increases;
- decide whether SMS is required for launch or remains a later enhancement.
