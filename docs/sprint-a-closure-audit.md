# Sprint A Closure Audit

Date: 2026-08-03
Branch: `codex/prod-readiness-20260803`

## Verdict

Sprint A is functionally complete, but release closure requires focused evidence for scheduler and permission behavior.

## Verified

- API build passes.
- Web build passes.
- Production API and app health checks return HTTP 200.
- Reminder data models exist:
  - `Commitment`
  - `MonthlyCommitmentInstance`
  - `CommitmentReminderDelivery`
  - `WorkspaceBotSettings`
- Monthly commitment instances are unique by `commitmentId + periodYear + periodMonth`.
- Archive uses `archivedAt`; historical monthly instances are not hard-deleted.
- Dashboard and WhatsApp commands use the same backend commitment service.
- Scheduler uses database-backed delivery records with idempotency keys, claim tokens, retry limits, and send-after-success state updates.
- Bot Settings are database-backed.
- HitPay files were not changed by Sprint A closure work.

## Added closure tests

The API now includes Node built-in tests for:

- monthly due dates when due day exceeds month length;
- reminder date calculation from due date, days-before, and configured time;
- quiet hours rollover for late-night reminders;
- quiet hours rollover for early-morning reminders.

Run:

```text
cd apps/api && pnpm run test
```

## Remaining release-close evidence

These should be tested with controlled fixtures before Sprint B:

1. Scheduler sends one due reminder only once.
2. Bot disabled prevents scheduled notification.
3. WhatsApp notification disabled prevents scheduled notification.
4. Cross-workspace access is rejected.
5. OWNER/ADMIN/MEMBER behavior is verified for commitment management.
6. Marking a commitment paid creates one idempotent transaction and syncs to Google Sheets.

## Product note

The active product roles are super admin, owner, admin, and member. Legacy `VIEWER` type references still exist in generated/schema-related code paths and should be cleaned in a separate RBAC cleanup task if the product model is final.
