# Hyrbart pre-launch checklist

Status: working launch gate. Keep this file aligned with Jira and production behavior.

## 1. Core renter journey
- [x] Search by text/category/date/place
- [x] Product page with pricing context
- [x] Booking request lifecycle
- [x] Simulated payment capture and refund ledger
- [x] Cancellation policy snapshot
- [x] Pickup/return condition flow
- [x] Issues/disputes
- [x] Double-blind reviews
- [x] Favorites with loading/empty/error recovery states
- [ ] Real PSP/payment provider
- [ ] Real BankID/KYC
- [ ] Insurance/protection provider

## 2. Host journey
- [x] Host profile/onboarding foundation
- [x] Create/edit listings
- [x] Category taxonomy
- [x] Booking management
- [x] Notifications and reminders
- [x] External reputation import flow
- [ ] Real payout account onboarding/provider

## 3. Trust, safety and support
- [x] Booking state guards
- [x] Atomic dispute/case handling
- [x] Admin risk queue
- [x] Review moderation
- [x] Admin audit trail
- [x] Finance/reconciliation view
- [x] Listing moderation fail-closed
- [x] Incident- och supportplaybook med payment/data/safety-tabletop
- [ ] Final prohibited-items policy review

## 4. Reliability and security
- [x] Booking automation cron + idempotency
- [x] Notification retry worker
- [x] DB race-condition hardening
- [x] RLS/FK performance fixes
- [x] Rate limiting on public geocoding and translation endpoints
- [x] Service-role-only internal rate-limit RPC
- [x] Global/locale loading, error and 404 fallbacks
- [x] Deterministic booking state-machine + Stockholm timezone regression tests in CI
- [x] Public desktop/mobile browser smoke tests in CI
- [x] Correlation-id, structured operational logging and persistent alert trail
- [x] Non-destructive logical restore drill + documented recovery runbook
- [ ] Managed Supabase backup policy before external launch
- [ ] Storage-object backup/restore for private evidence and attachments
- [ ] Supabase leaked-password protection (paid plan)
- [ ] Authenticated seeded end-to-end booking/cancellation/dispute race suite in CI

## 5. Accessibility and mobile
- [x] Pinch zoom allowed
- [x] Skip-to-content link
- [x] Consistent keyboard focus-visible treatment
- [x] Reduced-motion fallback for launch loading animation
- [x] Mobile-sized launch/error actions
- [x] Automated WCAG A/AA axe gate on key public routes (desktop + mobile)
- [x] Automated contrast audit on key public routes
- [ ] Formal WCAG keyboard pass over all dialogs/dropdowns
- [ ] Screen-reader pass over booking and dispute flows

## 6. Content and legal
- [x] Rental agreement foundation
- [x] Cancellation rules in product/booking flow
- [x] Privacy/account settings foundation
- [ ] Final legal review of marketplace terms
- [ ] Final privacy/GDPR retention/export/delete review
- [ ] DAC7 production process and required data validation

## 7. External services before public launch
These are intentionally deferred while Hyrbart stays on the no-cost implementation track.
- [ ] PSP/live card payments
- [ ] BankID/KYC
- [ ] Payout provider
- [ ] Insurance/protection
- [ ] Production transactional email provider/configuration
- [ ] Supabase paid plan with managed backup policy; decide on PITR based on accepted RPO

## 8. Release gate
Before removing no-index / opening Hyrbart publicly:
- [ ] All P0/P1 launch bugs closed
- [ ] Production smoke test: renter search → request → accept → pay → pickup → return → complete → review
- [ ] Production smoke test: cancellation/refund
- [ ] Production smoke test: problem/damage/dispute and payout hold
- [ ] Mobile smoke test on iOS Safari and Android Chrome
- [x] Admin/support runbook tested (payment, data, safety tabletop 2026-09-14)
- [ ] Monitoring/alert ownership decided for external-customer operations
- [x] Backup/recovery procedure documented and logical restore mechanics verified 2026-09-14
- [ ] Managed backup + Storage backup restore drill in isolated environment before public launch
- [ ] Remove `robots: noindex` only after all launch blockers above are accepted
