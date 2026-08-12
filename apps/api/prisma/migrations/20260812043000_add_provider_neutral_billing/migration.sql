BEGIN;

CREATE TYPE "BillingInterval" AS ENUM (
  'MONTHLY',
  'SIX_MONTHS',
  'YEARLY'
);

CREATE TYPE "BillingRenewalMethod" AS ENUM (
  'AUTOMATIC',
  'MANUAL'
);

CREATE TYPE "BillingAccessState" AS ENUM (
  'PENDING',
  'ACTIVE',
  'PAYMENT_DUE',
  'GRACE',
  'SUSPENDED',
  'CANCELED'
);

CREATE TYPE "BillingPaymentAttemptStatus" AS ENUM (
  'CREATED',
  'PENDING',
  'PAID',
  'FAILED',
  'EXPIRED',
  'CANCELED',
  'REFUNDED'
);

CREATE TYPE "BillingRenewalStatus" AS ENUM (
  'SCHEDULED',
  'INVOICED',
  'PAID',
  'FAILED',
  'EXPIRED',
  'CANCELED'
);

ALTER TABLE "WorkspaceBillingSubscription"
ADD COLUMN "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN "renewalMethod" "BillingRenewalMethod" NOT NULL DEFAULT 'AUTOMATIC',
ADD COLUMN "accessState" "BillingAccessState" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'MYR',
ADD COLUMN "autoRenewEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "paidThroughAt" TIMESTAMP(3),
ADD COLUMN "nextRenewalAt" TIMESTAMP(3),
ADD COLUMN "paymentDueAt" TIMESTAMP(3),
ADD COLUMN "graceEndsAt" TIMESTAMP(3),
ADD COLUMN "suspendedAt" TIMESTAMP(3),
ADD COLUMN "reactivatedAt" TIMESTAMP(3);

-- Existing HitPay subscriptions were monthly automatic subscriptions. Preserve
-- every provider identifier and history row while deriving neutral access dates.
UPDATE "WorkspaceBillingSubscription"
SET
  "billingInterval" = 'MONTHLY',
  "renewalMethod" = 'AUTOMATIC',
  "accessState" = CASE
    WHEN "status" = 'ACTIVE' THEN 'ACTIVE'::"BillingAccessState"
    WHEN "status" IN ('CANCELED', 'INACTIVE') THEN 'CANCELED'::"BillingAccessState"
    ELSE 'PENDING'::"BillingAccessState"
  END,
  "paidThroughAt" = COALESCE("paidThroughAt", "currentPeriodEnd"),
  "nextRenewalAt" = CASE
    WHEN "status" = 'ACTIVE' THEN COALESCE("nextRenewalAt", "currentPeriodEnd")
    ELSE "nextRenewalAt"
  END;

ALTER TABLE "WorkspaceBillingSubscription"
ADD CONSTRAINT "WorkspaceBillingSubscription_currency_check"
CHECK ("currency" ~ '^[A-Z]{3}$');

CREATE TABLE "BillingRecurringToken" (
  "id" TEXT NOT NULL,
  "workspaceBillingSubscriptionId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerTokenId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "paymentMethodType" TEXT,
  "fingerprint" TEXT,
  "lastFour" TEXT,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingRecurringToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingRecurringToken_last_four_check"
    CHECK ("lastFour" IS NULL OR "lastFour" ~ '^[0-9]{4}$')
);

CREATE TABLE "BillingPaymentAttempt" (
  "id" TEXT NOT NULL,
  "workspaceBillingSubscriptionId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerCheckoutId" TEXT,
  "providerPaymentId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "attemptType" TEXT NOT NULL,
  "status" "BillingPaymentAttemptStatus" NOT NULL DEFAULT 'CREATED',
  "plan" TEXT NOT NULL,
  "billingInterval" "BillingInterval" NOT NULL,
  "renewalMethod" "BillingRenewalMethod" NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "baseAmount" DECIMAL(10,2) NOT NULL,
  "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "amountDue" DECIMAL(10,2) NOT NULL,
  "coverageStart" TIMESTAMP(3),
  "coverageEnd" TIMESTAMP(3),
  "checkoutUrl" TEXT,
  "expiresAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingPaymentAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingPaymentAttempt_currency_check"
    CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "BillingPaymentAttempt_amounts_check"
    CHECK (
      "baseAmount" >= 0
      AND "discountAmount" >= 0
      AND "amountDue" >= 0
      AND "discountAmount" <= "baseAmount"
      AND "amountDue" <= "baseAmount"
    ),
  CONSTRAINT "BillingPaymentAttempt_coverage_check"
    CHECK (
      "coverageStart" IS NULL
      OR "coverageEnd" IS NULL
      OR "coverageEnd" > "coverageStart"
    )
);

CREATE TABLE "BillingRenewal" (
  "id" TEXT NOT NULL,
  "workspaceBillingSubscriptionId" TEXT NOT NULL,
  "paymentAttemptId" TEXT,
  "invoiceReference" TEXT NOT NULL,
  "status" "BillingRenewalStatus" NOT NULL DEFAULT 'SCHEDULED',
  "plan" TEXT NOT NULL,
  "billingInterval" "BillingInterval" NOT NULL,
  "renewalMethod" "BillingRenewalMethod" NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "amountDue" DECIMAL(10,2) NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "graceEndsAt" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "expiredAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingRenewal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingRenewal_currency_check"
    CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "BillingRenewal_amount_check"
    CHECK ("amountDue" >= 0),
  CONSTRAINT "BillingRenewal_dates_check"
    CHECK (
      "periodEnd" > "periodStart"
      AND "graceEndsAt" >= "dueAt"
    )
);

CREATE TABLE "BillingReminderDelivery" (
  "id" TEXT NOT NULL,
  "workspaceBillingSubscriptionId" TEXT NOT NULL,
  "billingRenewalId" TEXT,
  "dedupeKey" TEXT NOT NULL,
  "reminderType" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingReminderDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingSettings" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "annualDiscountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "personalFamilyGraceDays" INTEGER NOT NULL DEFAULT 3,
  "businessGraceDays" INTEGER NOT NULL DEFAULT 7,
  "updatedByUserId" TEXT,
  "updatedByEmail" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingSettings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingSettings_discount_percent_check"
    CHECK ("annualDiscountPercent" >= 0 AND "annualDiscountPercent" <= 100),
  CONSTRAINT "BillingSettings_grace_days_check"
    CHECK (
      "personalFamilyGraceDays" BETWEEN 0 AND 30
      AND "businessGraceDays" BETWEEN 0 AND 30
    ),
  CONSTRAINT "BillingSettings_version_check"
    CHECK ("version" >= 1)
);

CREATE TABLE "BillingSettingsAuditEvent" (
  "id" TEXT NOT NULL,
  "billingSettingsId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorEmail" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingSettingsAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingRecurringToken_provider_providerTokenId_key"
ON "BillingRecurringToken"("provider", "providerTokenId");
CREATE INDEX "BillingRecurringToken_subscription_status_idx"
ON "BillingRecurringToken"("workspaceBillingSubscriptionId", "status");

CREATE UNIQUE INDEX "BillingPaymentAttempt_idempotencyKey_key"
ON "BillingPaymentAttempt"("idempotencyKey");
CREATE UNIQUE INDEX "BillingPaymentAttempt_reference_key"
ON "BillingPaymentAttempt"("reference");
CREATE UNIQUE INDEX "BillingPaymentAttempt_provider_checkout_key"
ON "BillingPaymentAttempt"("provider", "providerCheckoutId");
CREATE UNIQUE INDEX "BillingPaymentAttempt_provider_payment_key"
ON "BillingPaymentAttempt"("provider", "providerPaymentId");
CREATE INDEX "BillingPaymentAttempt_subscription_status_created_idx"
ON "BillingPaymentAttempt"("workspaceBillingSubscriptionId", "status", "createdAt");
CREATE INDEX "BillingPaymentAttempt_status_expires_idx"
ON "BillingPaymentAttempt"("status", "expiresAt");

CREATE UNIQUE INDEX "BillingRenewal_paymentAttemptId_key"
ON "BillingRenewal"("paymentAttemptId");
CREATE UNIQUE INDEX "BillingRenewal_invoiceReference_key"
ON "BillingRenewal"("invoiceReference");
CREATE INDEX "BillingRenewal_subscription_status_due_idx"
ON "BillingRenewal"("workspaceBillingSubscriptionId", "status", "dueAt");
CREATE INDEX "BillingRenewal_status_due_idx"
ON "BillingRenewal"("status", "dueAt");
CREATE INDEX "BillingRenewal_status_grace_idx"
ON "BillingRenewal"("status", "graceEndsAt");

CREATE UNIQUE INDEX "BillingReminderDelivery_dedupeKey_key"
ON "BillingReminderDelivery"("dedupeKey");
CREATE INDEX "BillingReminderDelivery_subscription_status_scheduled_idx"
ON "BillingReminderDelivery"("workspaceBillingSubscriptionId", "status", "scheduledFor");
CREATE INDEX "BillingReminderDelivery_renewal_idx"
ON "BillingReminderDelivery"("billingRenewalId");
CREATE INDEX "BillingReminderDelivery_status_scheduled_idx"
ON "BillingReminderDelivery"("status", "scheduledFor");

CREATE INDEX "WorkspaceBillingSubscription_access_due_idx"
ON "WorkspaceBillingSubscription"("accessState", "paymentDueAt");
CREATE INDEX "WorkspaceBillingSubscription_access_grace_idx"
ON "WorkspaceBillingSubscription"("accessState", "graceEndsAt");
CREATE INDEX "WorkspaceBillingSubscription_next_renewal_idx"
ON "WorkspaceBillingSubscription"("nextRenewalAt");

CREATE INDEX "BillingSettingsAuditEvent_settings_created_idx"
ON "BillingSettingsAuditEvent"("billingSettingsId", "createdAt");
CREATE INDEX "BillingSettingsAuditEvent_actor_created_idx"
ON "BillingSettingsAuditEvent"("actorEmail", "createdAt");

ALTER TABLE "BillingRecurringToken"
ADD CONSTRAINT "BillingRecurringToken_subscription_fkey"
FOREIGN KEY ("workspaceBillingSubscriptionId")
REFERENCES "WorkspaceBillingSubscription"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillingPaymentAttempt"
ADD CONSTRAINT "BillingPaymentAttempt_subscription_fkey"
FOREIGN KEY ("workspaceBillingSubscriptionId")
REFERENCES "WorkspaceBillingSubscription"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillingRenewal"
ADD CONSTRAINT "BillingRenewal_subscription_fkey"
FOREIGN KEY ("workspaceBillingSubscriptionId")
REFERENCES "WorkspaceBillingSubscription"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillingRenewal"
ADD CONSTRAINT "BillingRenewal_payment_attempt_fkey"
FOREIGN KEY ("paymentAttemptId")
REFERENCES "BillingPaymentAttempt"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BillingReminderDelivery"
ADD CONSTRAINT "BillingReminderDelivery_subscription_fkey"
FOREIGN KEY ("workspaceBillingSubscriptionId")
REFERENCES "WorkspaceBillingSubscription"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillingReminderDelivery"
ADD CONSTRAINT "BillingReminderDelivery_renewal_fkey"
FOREIGN KEY ("billingRenewalId")
REFERENCES "BillingRenewal"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BillingSettingsAuditEvent"
ADD CONSTRAINT "BillingSettingsAuditEvent_settings_fkey"
FOREIGN KEY ("billingSettingsId")
REFERENCES "BillingSettings"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "prevent_billing_settings_audit_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'BillingSettingsAuditEvent rows are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "BillingSettingsAuditEvent_immutable"
BEFORE UPDATE OR DELETE ON "BillingSettingsAuditEvent"
FOR EACH ROW EXECUTE FUNCTION "prevent_billing_settings_audit_mutation"();

INSERT INTO "BillingSettings" (
  "id",
  "annualDiscountPercent",
  "personalFamilyGraceDays",
  "businessGraceDays",
  "updatedByEmail",
  "updatedAt"
) VALUES (
  'global',
  0,
  3,
  7,
  'system@imai.my',
  CURRENT_TIMESTAMP
);

INSERT INTO "BillingSettingsAuditEvent" (
  "id",
  "billingSettingsId",
  "actorEmail",
  "action",
  "after"
) VALUES (
  'billing_settings_audit_initial',
  'global',
  'system@imai.my',
  'SETTINGS_CREATED',
  '{"annualDiscountPercent":0,"personalFamilyGraceDays":3,"businessGraceDays":7}'::jsonb
);

COMMIT;
