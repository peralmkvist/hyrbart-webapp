# Hyrbart backup & restore runbook

Status: launch underlag for SCRUM-87. Last verified: 2026-09-14.

## Objective
Critical Hyrbart data must be recoverable within an explicitly accepted recovery point objective (RPO) and recovery time objective (RTO), with no destructive restore performed before scope, source and expected data loss are understood.

## Current platform state
- Supabase project: `hyrbart` (`wpmqymhzqjaizsdjonec`), region `eu-central-1`.
- Current Supabase organization plan: Free.
- Free projects do not provide downloadable managed database backups. Supabase recommends regular logical exports using CLI/pg_dump and off-site storage.
- Managed daily backups and restore-to-new-project are paid-plan features. PITR is a paid add-on and provides a substantially lower RPO.
- Supabase database backups contain database metadata for Storage but do **not** restore deleted Storage objects. Storage therefore needs its own backup strategy.
- Application/schema history is versioned in GitHub through migrations and source code.

## Launch decision
Before public customer launch, Hyrbart must move from "best effort logical backup" to a defined production policy:

1. Paid Supabase plan with managed daily backups enabled at minimum.
2. Recommended for monetary/booking production data: PITR if financially acceptable.
3. A separate Storage-object backup/export procedure for booking attachments, condition photos, automated-message assets and other private buckets.
4. Scheduled logical database export kept outside Supabase as a second recovery path.
5. Quarterly restore drill, and additionally after material database/storage architecture changes.

### Proposed targets
- Beta/no-real-money: RPO <= 24 h, RTO <= 4 h.
- Public launch with payments: target RPO <= 2 h; use PITR if this target is accepted. Target RTO <= 2 h for database recovery, excluding external provider recovery.
- Safety/security incidents may require restoring selected data rather than full-project rollback.

These are product/operations decisions and must be explicitly accepted before launch.

## Backup scope
### Database-critical
At minimum:
- auth users and profiles
- bookings and booking events
- booking messages metadata
- payment/payout ledger and cancellation/refund records
- booking condition records and disputes/cases
- rental agreements
- reviews/reputation
- notification preferences and delivery state
- privacy/consent records
- admin memberships, audit and security events
- rental rules, availability and search alerts

### Storage-critical
Database backup alone is insufficient. Back up private objects for:
- booking attachments/messages
- pickup/return condition photos
- automated host-message assets
- import assets and other evidence

Never assume a database restore recreates deleted Storage files.

### Configuration/code
- GitHub main branch and migration files are the canonical schema/code history.
- Vercel and Supabase environment/configuration must be documented separately; database restore does not recreate all provider settings or keys.

## Incident restore procedure
1. **Declare incident and stop writes where necessary.** Assign Incident Commander and incident ID per incident-support playbook.
2. **Preserve evidence.** Record current commit, request/correlation IDs, affected entities, timestamps and provider state.
3. **Define restore scope.** Decide between row-level repair, logical restore, restore-to-new-project or full in-place managed restore. Prefer the smallest safe scope.
4. **Select recovery point.** Choose the newest trusted point before corruption. Explicitly document estimated data loss between restore point and incident containment.
5. **Protect current state.** Take an additional logical snapshot/export when possible before any destructive restore.
6. **Restore into isolation first whenever possible.** Paid plan: restore to a new project. Verify data before cut-over. Do not point production traffic at the restored copy until checks pass.
7. **Disable side effects in a cloned restore.** Prevent cron, webhooks, emails, payouts, provider callbacks and other external operations from firing against restored historical data.
8. **Verify integrity.** Compare row counts/checksums for critical tables, referential integrity, auth access, booking state, ledger totals, agreements and audit data.
9. **Verify Storage separately.** Confirm required private files exist and signed-access flows work. Restore missing objects from Storage backup if needed.
10. **Reconcile external systems.** Payments, payouts, email, KYC/BankID and insurance providers are not rolled back automatically. Provider truth must be reconciled before resuming monetary actions.
11. **Smoke test.** Run `/api/health`, admin login/MFA, booking reads, messaging, core write paths and critical automation in a controlled scope.
12. **Reopen gradually.** Only Incident Commander can approve reopening writes/customer traffic after exit criteria are met.
13. **Postmortem.** Record actual RPO/RTO, lost/replayed transactions, follow-up actions and next restore-test date.

## Do not do
- Do not restore production merely because a backup exists; first determine scope and expected loss.
- Do not retry payment/refund/payout side effects blindly after rollback.
- Do not assume Storage files are restored with the database.
- Do not overwrite audit/evidence data to make restored state look current.
- Do not perform a Sanity restore/write as part of this runbook while the current Sanity freeze is active; Sanity recovery is a separate controlled process.

## Restore drill — 2026-09-14
A non-destructive database restore drill was run against the production database structure inside one transaction using temporary tables only. Production rows were never deleted or modified.

Method:
1. Snapshot critical source tables into temporary backup copies.
2. Calculate row counts and deterministic JSON checksums.
3. Delete all rows from temporary working copies to simulate loss.
4. Restore the working copies from the temporary backups.
5. Recalculate counts/checksums.
6. Compare before/after.
7. Roll back the transaction.

Results:

| Table | Before | Restored | Count match | Checksum match |
|---|---:|---:|---|---|
| profiles | 6 | 6 | yes | yes |
| bookings | 1 | 1 | yes | yes |
| booking_messages | 3 | 3 | yes | yes |

Result: **PASS**. The logical snapshot/restore mechanism preserved all tested rows byte-equivalently at JSON representation level. This verifies the restore procedure mechanics, not Supabase's managed backup service.

## Remaining launch gates
- Upgrade/confirm managed backup policy before external customer launch.
- Decide whether PITR is required based on accepted RPO and cost.
- Implement and test Storage-object backup/restore.
- Produce an off-Supabase scheduled logical export and verify its restore in an isolated database/project.
- Name the operational owner for backups and quarterly restore drills.
