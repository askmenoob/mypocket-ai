-- Preserve paid access for pre-CHIP subscriptions while giving the neutral
-- lifecycle scheduler a real due date, grace deadline, and reminder schedule.
-- Provider identifiers remain unchanged; legacy subscriptions are never
-- charged through CHIP until the owner explicitly starts a CHIP checkout.
UPDATE "WorkspaceBillingSubscription"
SET
  "paidThroughAt" = COALESCE("paidThroughAt", "currentPeriodEnd"),
  "nextRenewalAt" = COALESCE("nextRenewalAt", "currentPeriodEnd"),
  "paymentDueAt" = COALESCE("paymentDueAt", "currentPeriodEnd"),
  "graceEndsAt" = COALESCE(
    "graceEndsAt",
    "currentPeriodEnd" + CASE
      WHEN "plan" = 'BUSINESS' THEN INTERVAL '7 days'
      ELSE INTERVAL '3 days'
    END
  )
WHERE
  "status" = 'ACTIVE'
  AND "accessState" IN ('ACTIVE', 'PAYMENT_DUE', 'GRACE')
  AND "currentPeriodEnd" IS NOT NULL
  AND (
    "paidThroughAt" IS NULL
    OR "nextRenewalAt" IS NULL
    OR "paymentDueAt" IS NULL
    OR "graceEndsAt" IS NULL
  );
