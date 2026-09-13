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
- [ ] Final prohibited-items policy review
- [ ] Final support escalation playbook

## 4. Reliability and security
- [x] Booking automation cron + idempotency
- [x] Notification retry worker
- [x] DB race-condition hardening
- [x] RLS/FK performance fixes
- [x] Rate limiting on public geocoding and translation endpoints
- [x] Service-role-only internal rate-limit RPC
- [x] Global/locale loading, error and 404 fallbacks
- [ ] Supabase leaked-password protection (paid plan)
- [ ] Automated end-to-end lifecycle race tests in CI

## 5. Accessibility and mobile
- [x] Pinch zoom allowed
- [x] Skip-to-content link
- [x] Consistent keyboard focus-visible treatment
- [x] Reduced-motion fallback for launch loading animation
- [x] Mobile-sized launch/error actions
- [ ] Formal WCAG keyboard pass over all dialogs/dropdowns
- [ ] Screen-reader pass over booking and dispute flows
- [ ] Contrast audit with automated tooling

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
- [ ] Supabase Pro security feature(s), if still needed

## 8. Release gate
Before removing no-index / opening Hyrbart publicly:
- [ ] All P0/P1 launch bugs closed
- [ ] Production smoke test: renter search → request → accept → pay → pickup → return → complete → review
- [ ] Production smoke test: cancellation/refund
- [ ] Production smoke test: problem/damage/dispute and payout hold
- [ ] Mobile smoke test on iOS Safari and Android Chrome
- [ ] Admin/support runbook tested
- [ ] Monitoring/alert ownership decided
- [ ] Backup/recovery procedure documented
- [ ] Remove `robots: noindex` only after all launch blockers above are accepted
