-- Keep historical provider values intact while ensuring every new billing row
-- defaults to the active CHIP integration.
ALTER TABLE "WorkspaceBillingSubscription"
  ALTER COLUMN "provider" SET DEFAULT 'CHIP';

ALTER TABLE "BillingWebhookEvent"
  ALTER COLUMN "provider" SET DEFAULT 'CHIP';
