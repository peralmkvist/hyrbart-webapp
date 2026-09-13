# Authenticated production E2E

Hyrbarts authenticated production quality gate validates the central booking lifecycle against the exact commit currently deployed on `hyrbart.se`.

## Scenarios

1. Request → accept → payment → pickup → return → completion → double-blind reviews.
2. Paid cancellation → simulated refund.
3. Dispute opening → atomic state change and duplicate protection.
4. Concurrent payment requests → idempotent payment capture.

## Fixture isolation

Each GitHub Actions run creates two temporary authenticated users and four bookings. Fixture bookings use a run-specific synthetic `product_id` so stale or parallel CI fixtures cannot collide with the production exclusion constraint that prevents overlapping active bookings for a physical product.

If fixture setup fails after partially creating data, the seed endpoint rolls back any bookings and test users it created. Successful runs remove condition-photo objects, bookings, and users in the cleanup step.

The `authenticated-main` job waits until `/api/health` reports the exact Git commit being tested before it seeds data or runs lifecycle assertions. This prevents a green result against an older production deployment.
