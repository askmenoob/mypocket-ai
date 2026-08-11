# Sprint L promotion controls

## Boundary

Promotions are owned by MyPocket. The module does not import HitPay, create a provider coupon, or mutate provider state. The existing HitPay checkout and return paths remain unchanged.

## Data and migration

Migration `20260811103000_add_promotion_controls` is additive and has not been applied. It creates:

- `PromoCampaign` for code configuration and lifecycle;
- `PromoRedemption` for user, plan, pricing, trial and conversion state;
- `PromoAuditEvent` as an append-only audit trail;
- database checks for code format, validity, limits and coherent promotion types;
- a unique hashed idempotency key;
- a no-delete trigger for redemptions and an update/delete blocker for audit events.

The migration seeds `CUBA14` as `DISABLED`, with a 14-day free trial, new-user-only eligibility, one redemption per user, all three paid plans, required payment method and automatic conversion disclosure. Super Admin must review its validity window before enabling it.

## Authorization assumption

All promotion management routes use `[app.authenticate, requireSuperAdmin]`. This intentionally preserves the current application contract: even the configured Super Admin must have a valid membership in the workspace carried by the JWT. The service then rechecks the actor in the database and requires an active user whose current email is the configured Super Admin email.

## Concurrency and history

Redemption uses a serializable transaction. Eligibility counts and create happen in the same transaction. Prisma `P2034` serialization conflicts retry at most three times; after that the API fails closed with a retry response and requires the same client idempotency key. Concurrent replay with the same key returns the existing redemption and creates no duplicate audit event.

## Integration sequence

1. Reconcile the additive schema and generated Prisma client with the target integration branch.
2. Run `prisma validate` and review the SQL without applying it.
3. Merge the promotion module and the `app.ts` registration.
4. Reconcile the isolated `PromoCodeSettings` and `PromoQuoteDisclosure` components into the current Super Admin and billing modal bootstrap.
5. Run all API tests, API build, web typecheck/build and `git diff --check`.
6. Back up the production database before applying the migration.
7. Apply the migration in a controlled deployment; confirm `CUBA14` remains disabled.
8. Use Super Admin to review dates and limits before enabling any campaign.

## Deliberate activation gate

The billing modal calls only `/promotion/quote`. It discloses trial expiry, first and next charge, next charge date, cancellation deadline, payment-method requirement and conversion behavior. It explicitly creates no redemption, checkout or payment.

Connecting an accepted redemption to paid checkout/access activation remains a separate integration gate. Do not call `/promotion/redeem` from checkout until the billing owner defines the atomic activation contract and proves provider/webhook/database reconciliation. Until then, user activation is **partial**, while campaign administration, eligibility, audit, disclosure and idempotency are source-complete.
