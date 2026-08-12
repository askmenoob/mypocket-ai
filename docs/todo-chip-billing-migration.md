# TODO — CHIP Billing Migration

Last updated: 2026-08-12 (Asia/Kuala_Lumpur)

Legend: `[ ]` pending, `[~]` in progress, `[x]` completed, `[!]` blocked.

## Safety and compatibility

- [x] Capture source branch, HEAD, working-tree state, and unrelated receipt work.
- [x] Retire every active HitPay checkout, plan-change, webhook, client, environment, script, and UI path.
- [x] Keep only immutable historical migration files until the sandbox data is safely removed after backup.
- [x] Restrict the runtime provider gate to `disabled` or `chip`; HitPay cannot be selected again.
- [x] Remove HitPay secrets from runtime after the retirement release is deployed.

Runtime evidence (2026-08-12): focused provider-switch tests 3/3 pass, API TypeScript build passes, `mypocket.service` is active, local/public health returns HTTP 200, and the runtime gate is `BILLING_CHECKOUT_PROVIDER=chip` with `CHIP_ENVIRONMENT=test`.

## Schema migration

- [x] Add billing intervals: `MONTHLY`, `SIX_MONTHS`, `YEARLY`.
- [x] Add renewal methods: `AUTOMATIC`, `MANUAL`.
- [x] Add provider-neutral purchase, recurring-token, renewal, grace, suspension, and reminder fields.
- [x] Add provider-neutral payment attempt/idempotency records where required.
- [x] Add global billing settings for annual discount percentage and grace periods.
- [x] Preserve the earlier migration chain while retiring sandbox HitPay rows through a separately backed-up cleanup.
- [x] Add an additive Prisma migration with database constraints and indexes.
- [x] Regenerate and review the tracked Prisma client.
- [x] Prove the full migration chain on isolated PostgreSQL, back up the live database, then apply the additive migration through the database-owner path.

Migration evidence (2026-08-12): the full chain first passed in an ephemeral PostgreSQL 15 container. The live database was then saved to `.deploy-backups/imai-pre-sprint-n-20260812.dump` (115,167 bytes) before `20260812043000_add_provider_neutral_billing` was applied by the database-owner path. Prisma reports all 21 migrations up to date, the application role has the required table privileges, the temporary authentication exception was removed, and existing `HITPAY` rows were preserved.

## CHIP integration

- [x] Add sandbox/production environment validation without storing secrets in source.
- [x] Implement CHIP API client with timeout, typed failures, and idempotency references.
- [x] Implement signed CHIP webhook verification before changing access.
- [x] Store webhook events idempotently and reject replay/double activation.
- [x] Implement card recurring-token flow for automatic renewal.
- [x] Implement manual checkout for FPX, Touch 'n Go, and DuitNow QR.
- [x] Load enabled payment methods dynamically from CHIP rather than assuming availability.
- [x] Implement payment status reconciliation, refunds/cancellations, and safe retry behavior.
- [x] Align final refund and chargeback handling with the official `payment.refunded` / `payment.charged_back` payload and its `related_to` purchase ID.
- [x] Restrict the Test Mode webhook to paid, failure, recurring-charge failure, cancellation, refund, and chargeback events only.

## Plans, duration, and pricing

- [x] Personal Pro: RM9 monthly, RM54 / 6 months, RM108 / year before discount.
- [x] Family: RM19 monthly, RM114 / 6 months, RM228 / year before discount.
- [x] Business: RM49 monthly, RM294 / 6 months, RM588 / year before discount.
- [x] Apply Super Admin annual percentage discount server-side with currency-safe rounding.
- [x] Display base price, discount, amount due, coverage dates, and renewal method before checkout.
- [x] Early renewal extends from the existing paid-through date, not the payment date.
- [x] Immediate upgrades charge the prorated remaining-period difference and activate only after a signed success webhook.
- [x] Downgrades take effect at the next renewal boundary.
- [x] Canceling automatic renewal retains access until the paid-through date.

## Renewal, warning, and access policy

- [x] Manual renewals create a unique expiring invoice each cycle.
- [x] Monthly plans warn at D-7, D-3, D-1, and D0.
- [x] Six-month/yearly plans warn at D-30, D-14, D-7, and D0.
- [x] Personal/Family receive a 3-day grace period; Business receives 7 days.
- [x] Transition access through `ACTIVE` -> `PAYMENT_DUE` -> `GRACE` -> `SUSPENDED`.
- [x] During grace, WhatsApp continues with a concise payment warning.
- [x] During suspension, block transaction, receipt, voice, AI, Google Sheets, and Drive writes.
- [x] During suspension, keep `!pay`, `!status`, `!help`, and `!cancel` available.
- [x] Keep dashboard/data read-only and never delete customer records because of non-payment.
- [x] Reactivate immediately and idempotently after a signed successful webhook.
- [x] Send WhatsApp confirmation after successful reactivation.

## Super Admin and customer UI

- [x] Add Super Admin annual-discount percentage control with validation and audit trail.
- [x] Add 1-month, 6-month, and 1-year selectors to the subscription manager.
- [x] Label card as automatic renewal and QR/FPX/TNG as manual renewal.
- [x] Show due date, grace deadline, suspension state, payment link, and renewal history.
- [x] Replace HitPay-specific return handling and copy with provider-neutral CHIP status handling.
- [x] Add accessible loading/error/retry states for checkout and payment confirmation.

## Verification and rollout gates

- [x] Focused pricing/discount/date arithmetic tests pass.
- [x] Focused authorization, webhook-signature, replay, idempotency, and concurrency tests pass.
- [x] Focused WhatsApp grace/suspension command tests pass.
- [x] Existing receipt, voice, transaction, promotion, Google, and CHIP tests remain green after HitPay runtime removal.
- [x] Full API tests and TypeScript build pass.
- [x] Full web TypeScript/Vite build passes.
- [~] CHIP Test Mode hosted card checkout and signed success activation are verified for RM19 monthly and RM228 yearly payments. CHIP reports FPX, Touch 'n Go, DuitNow QR, Visa, Mastercard, and other manual methods as enabled; completed sandbox payments for the remaining manual methods are still pending.
- [~] Sandbox renewal, failed-payment, grace, suspension, refund, and reactivation lifecycle tests pass deterministically. Final hosted-payment E2E for those outcomes remains pending.
- [x] Review diff for secrets, unrelated files, generated noise, and destructive SQL.
- [x] Apply the live additive migration only after explicit deployment approval and verified backup.
- [!] Enable CHIP production only after merchant approval, production credentials, and sandbox E2E evidence are present.
- [x] Commit/push the verified Test Mode implementation while keeping live-money activation blocked.

## Rollback and current runtime state

- Runtime is `BILLING_CHECKOUT_PROVIDER=chip` in CHIP Test Mode. HitPay is not a supported runtime provider and has no route, client, webhook, configuration, or marketing path.
- To roll back application code, restore the immediately preceding source/database backups and rebuild API/web. Do not edit or remove an already-applied migration file.
- The default provider for every new subscription and webhook row is CHIP. Returning to HitPay would require a separately reviewed new implementation; it is not a configuration switch.
- The pre-migration custom database dump is the last-resort disaster-recovery artifact. Restoring it is destructive and requires a maintenance window, exact target verification, and a separate explicit approval.
- Deployment evidence (2026-08-12): 267/267 API tests pass, the recurring-token and renewal-safety tests pass, API and web builds pass, Prisma validates, all 23 migrations are current, API/web services are active, public health/web return HTTP 200, and an unsigned CHIP webhook is rejected with HTTP 401.
- Credential checkpoint (2026-08-12): CHIP Test Mode API key, Brand ID, webhook public key, webhook URL, and return URL are installed and cross-checked without exposing their values. The configured webhook callback and public key match the CHIP portal record.
- Sandbox checkout evidence (2026-08-12): Family monthly automatic renewal completed at RM19 by sandbox Mastercard, followed by Family yearly automatic renewal at RM228 by sandbox Visa. Both CHIP purchases report `is_test=true`, both signed `purchase.paid` events are `PROCESSED_ACTIVATED`, and paid coverage now extends through 2027-09-12.
- Recurring-token correction (2026-08-12): CHIP marks the paid Purchase itself with `is_recurring_token=true`; its Purchase ID is the token even when `recurring_token` is null. The webhook handler now follows that official contract, 12/12 focused CHIP tests pass, and the active yearly token was safely backfilled after a fresh database backup.
- Renewal hardening (2026-08-12): automatic CHIP token charges start only at the exact due time. New dashboard JWTs expire after 12 hours and transaction routes no longer print JWT payloads.
- HitPay retirement (2026-08-12): the user confirmed all HitPay activity was sandbox-only. Active HitPay runtime code, routes, configuration, scripts, tests, documentation, secrets, and sandbox database rows were retired after recoverable backups; historical migration files remain immutable.
- Source publication (2026-08-12): production commits `d00aa75`, `ef895b8`, and `c3075fa` are pushed to `codex/prod-readiness-20260803`. Live-money enablement remains blocked by the hosted lifecycle gates above.
- Rollback artifacts: `.env.backup-chip-activation-20260812-075800` plus scoped source/dist backups under `.deploy-backups/chip-refund-hotfix-*`, `.deploy-backups/chip-access-plan-*`, `.deploy-backups/chip-downgrade-label-*`, and `.deploy-backups/chip-recurring-hotfix-*`; pre-backfill database dump `.deploy-backups/chip-recurring-data-20260812-084007.dump`.
