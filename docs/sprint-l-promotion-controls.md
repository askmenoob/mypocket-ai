# Sprint L promotion controls

## Boundary

Promotions are owned by MyPocket. The module does not create provider coupons or store discounts in CHIP. CHIP receives only the server-calculated amount and signed checkout metadata.

## Data and migration

Migration `20260811103000_add_promotion_controls` is applied. It creates:

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

Checkout reservation uses the same serializable transaction as the billing attempt. Eligibility counts and reservation creation therefore cannot drift apart. Cancelled or failed attempts do not consume the campaign quota. A second additive migration, `20260812143000_link_promotions_to_billing_attempts`, links one redemption to one payment attempt and links a converting trial to its scheduled renewal.

## Integration sequence

1. Back up the production database and apply only the additive checkout-link migration.
2. Confirm the checkout calculates promo eligibility and amount again on the server.
3. Confirm zero-value trials create a CHIP card preauthorization, not an unpaid activation.
4. Activate access only after a signed `purchase.preauthorized` or `purchase.paid` webhook.
5. Create the conversion renewal at trial end and mark the redemption `CONVERTED` only after its signed paid webhook.
6. Cancel reserved redemptions on provider creation failure, failed webhook, cancellation, or expiry.
7. Keep the legacy public `/promotion/redeem` path fail-closed with `PROMO_CHECKOUT_REQUIRED`.

## Atomic activation contract

The CHIP billing modal includes an optional promo field. Quote and payment-method discovery accept the code for disclosure, but the final checkout repeats all eligibility and pricing checks inside the server transaction. The client cannot provide a price or claim that a payment method is attached.

`CUBA14` requires automatic renewal and a CHIP recurring-capable card. The RM0 purchase uses preauthorization; its billing attempt remains `PENDING` because no money was captured. Access and the 14-day trial start only after a valid signed webhook, and the normal plan amount is scheduled for the trial end. Failed or unsigned callbacks never activate access. Direct legacy redemption is intentionally blocked to prevent bypassing payment verification.

Fresh verification on 2026-08-12: Prisma validate/generate passed, 19 focused promotion/CHIP tests passed, the full API suite passed 218/218, API and web production builds passed, and `git diff --check` passed after generated-client normalization.
