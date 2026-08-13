ALTER TABLE "WorkspaceBillingSubscription"
ADD COLUMN "providerLastEventAt" TIMESTAMP(3);

COMMENT ON COLUMN "WorkspaceBillingSubscription"."providerLastEventAt" IS
  'Provider event time of the newest accepted billing webhook; older events are audit-only.';
