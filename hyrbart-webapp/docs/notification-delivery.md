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
6. The initial local state `sent` means Resend accepted the API request; it does not mean inbox delivery is proven.
7. The recurring notification maintenance job reconciles recent provider IDs against Resend and records the provider outcome.

## Delivery states

- `pending` – not yet attempted.
- `sent` – accepted by Resend; final delivery not yet confirmed.
- `delivered` – Resend reports delivered/opened/clicked.
- `failed` – API/request-level failure eligible for retry, max 3 delivery attempts.
- `terminal_failed` – provider reports bounced, complained, failed or suppressed; automatic resend is not performed.
- `skipped` – channel disabled, provider unavailable, no destination, frequency limit or event-specific suppression.

`email_last_event`, `email_delivered_at`, `email_terminal_failed_at` and `email_last_error` preserve the latest delivery evidence.

## Retry and duplicate protection

- Stable `event_key` prevents duplicate notification rows.
- Resend requests use an idempotency key derived from the notification event key/ID.
- Transient application-level failures are retried by notification maintenance up to three attempts.
- A provider-level terminal failure is recorded, not blindly retried.

## Provider and domain verification

- `hyrbart.se` is verified in Resend.
- Sending is enabled in EU region (`eu-west-1`).
- Existing Hyrbart transactional E2E emails have been observed in Resend, including both delivered and bounced outcomes.

## Acceptance test for SCRUM-56

Production smoke test uses three isolated rows:

1. Existing Resend ID with a known `delivered` outcome.
2. Existing Resend ID with a known `bounced` outcome.
3. A synthetic Hyrbart notification initialized as `failed`; the ordinary five-minute production maintenance worker must retry it through the real Hyrbart email delivery code, store the generated provider ID, and subsequently reconcile its final Resend status.

Synthetic test rows are marked with `metadata.synthetic=true` and are removed after verification.

## SMS

The notification matrix and user preference UI support SMS as a channel, but SMS delivery is intentionally inactive until an SMS provider, sender identity, phone-number verification model, cost controls and delivery/failure handling are selected and implemented. SCRUM-56 can satisfy its original acceptance criterion with verified email delivery (the Jira requirement is email **or** SMS), but SMS must not be represented as production-ready until that provider work exists.

## Launch gates

Before public launch:

- repeat delivery/failure smoke test against current production configuration;
- verify a real user can opt email on/off for an optional notification and that delivery follows the choice;
- verify transactional in-app notifications remain present when an external channel is disabled;
- monitor bounce/suppression rates and investigate abnormal increases;
- decide whether SMS is required for launch or remains a later enhancement.
