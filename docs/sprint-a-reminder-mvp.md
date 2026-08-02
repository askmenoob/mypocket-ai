# Sprint A — Reminder MVP End-to-End

## Scope

Sprint A adds monthly commitment reminders that are shared by WhatsApp, dashboard, and the scheduler through the same backend service and database models.

Out of scope for Sprint A:

- HitPay changes
- income/payment matching
- donut dashboard
- Groq/OpenAI router
- AI usage quota

## Roles

The active product roles are:

- `SUPER_ADMIN` through the existing super-admin email bypass where supported
- `OWNER`
- `ADMIN`
- `MEMBER`

Sprint A does not introduce or depend on a `VIEWER` role.

## Data model

Sprint A uses the existing Prisma models:

- `WorkspaceBotSettings`
- `Commitment`
- `MonthlyCommitmentInstance`
- `CommitmentReminderDelivery`

Monthly commitment instances are unique by:

```text
commitmentId + periodYear + periodMonth
```

Commitments are archived with `archivedAt`; history is not hard-deleted.

## Backend API

New authenticated routes:

```text
GET    /api/v1/commitments
POST   /api/v1/commitments
PATCH  /api/v1/commitments/:id
POST   /api/v1/commitments/:id/archive
POST   /api/v1/commitments/:id/pay-current
GET    /api/v1/bot-settings
PATCH  /api/v1/bot-settings
```

All routes derive workspace context from the authenticated token. The frontend does not send a trusted raw `workspaceId` for mutations.

## WhatsApp commands

Supported Sprint A commands:

```text
reminder
reminder semua
reminder selesai
senarai komitmen
Ingatkan bayaran kereta RM1000 setiap 10hb
Bil internet RM240 setiap 5hb
Tambah reminder elektrik RM200 setiap 25hb
ubah reminder kereta ke 15hb
tutup reminder kereta
aktifkan reminder kereta
padam komitmen kereta
bayar kereta
selesai kereta
```

WhatsApp commands call `CommitmentService`; they do not write directly to separate reminder logic.

## Dashboard

Dashboard adds:

- `Commitments & Reminders`
- `Bot Settings`

The commitments screen supports:

- add commitment
- list/filter commitments
- activate/deactivate
- archive
- mark current month as paid
- next reminder preview

Bot Settings supports:

- bot enabled
- timezone
- default reminder days before
- default reminder time
- quiet hours start/end

## Scheduler

`CommitmentScheduler` runs inside the API process as a polling runner. The timer is only the trigger; durable state and idempotency are stored in the database through `CommitmentReminderDelivery`.

Scheduler rules:

- creates due delivery rows from DB commitments
- uses `monthlyCommitmentId + kind` uniqueness
- respects bot disabled and WhatsApp notification disabled
- moves reminders out of quiet hours
- claims jobs before sending
- marks `SENT` only after Evolution send succeeds
- retries are limited by `maxAttempts`
- updates `reminderSentAt` and `lastReminderKey` after success

## Verification performed

Commands run on the production checkout branch:

```text
pnpm --filter @imai/api exec tsc --noEmit
cd apps/web && pnpm run build
```

Both passed during Sprint A implementation.

## Remaining validation before release

Before considering Sprint A fully production-proven, perform live E2E checks:

1. Add a reminder from WhatsApp and confirm it appears on dashboard.
2. Add a reminder from dashboard and confirm it appears in WhatsApp `reminder`.
3. Edit due day in dashboard and confirm WhatsApp shows the updated date.
4. Mark PAID and confirm it disappears from unpaid list and appears in paid list.
5. Confirm scheduler sends one reminder only for a due item.
6. Confirm bot disabled prevents scheduled notification.
7. Confirm quiet hours delay delivery.
