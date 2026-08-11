BEGIN;

CREATE TYPE "PromoCampaignType" AS ENUM (
  'FREE_TRIAL_DAYS',
  'PERCENTAGE',
  'FIXED_AMOUNT'
);

CREATE TYPE "PromoCampaignStatus" AS ENUM (
  'DRAFT',
  'ENABLED',
  'DISABLED',
  'EXPIRED',
  'ARCHIVED'
);

CREATE TYPE "PromoFirstChargeBehavior" AS ENUM (
  'CHARGE_DISCOUNTED_NOW',
  'DEFER_UNTIL_TRIAL_END'
);

CREATE TYPE "PromoRedemptionStatus" AS ENUM (
  'RESERVED',
  'ACTIVE',
  'CONVERTED',
  'CANCELLED',
  'EXPIRED'
);

CREATE TABLE "PromoCampaign" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" "PromoCampaignType" NOT NULL,
  "status" "PromoCampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "firstChargeBehavior" "PromoFirstChargeBehavior" NOT NULL,
  "discountValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "freeTrialDays" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "applicablePlans" TEXT[],
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "totalRedemptionLimit" INTEGER,
  "perUserRedemptionLimit" INTEGER NOT NULL DEFAULT 1,
  "newUsersOnly" BOOLEAN NOT NULL DEFAULT false,
  "requiresPaymentMethod" BOOLEAN NOT NULL DEFAULT false,
  "autoConvert" BOOLEAN NOT NULL DEFAULT false,
  "archivedAt" TIMESTAMP(3),
  "createdByEmail" TEXT NOT NULL,
  "updatedByEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromoCampaign_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PromoCampaign_code_format_check"
    CHECK ("code" = UPPER("code") AND "code" ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$'),
  CONSTRAINT "PromoCampaign_validity_check" CHECK ("endsAt" > "startsAt"),
  CONSTRAINT "PromoCampaign_limits_check"
    CHECK (
      "perUserRedemptionLimit" BETWEEN 1 AND 100
      AND ("totalRedemptionLimit" IS NULL OR "totalRedemptionLimit" >= 1)
    ),
  CONSTRAINT "PromoCampaign_type_value_check"
    CHECK (
      (
        "type" = 'FREE_TRIAL_DAYS'
        AND "freeTrialDays" BETWEEN 1 AND 365
        AND "discountValue" = 0
        AND "firstChargeBehavior" = 'DEFER_UNTIL_TRIAL_END'
      )
      OR (
        "type" = 'PERCENTAGE'
        AND "freeTrialDays" IS NULL
        AND "discountValue" > 0
        AND "discountValue" <= 100
        AND "firstChargeBehavior" = 'CHARGE_DISCOUNTED_NOW'
      )
      OR (
        "type" = 'FIXED_AMOUNT'
        AND "freeTrialDays" IS NULL
        AND "discountValue" > 0
        AND "firstChargeBehavior" = 'CHARGE_DISCOUNTED_NOW'
      )
    )
);

CREATE TABLE "PromoRedemption" (
  "id" TEXT NOT NULL,
  "promoCampaignId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userEmailSnapshot" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "status" "PromoRedemptionStatus" NOT NULL DEFAULT 'RESERVED',
  "idempotencyKey" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "originalAmount" DECIMAL(10,2) NOT NULL,
  "discountAmount" DECIMAL(10,2) NOT NULL,
  "firstChargeAmount" DECIMAL(10,2) NOT NULL,
  "trialEndsAt" TIMESTAMP(3),
  "nextChargeAt" TIMESTAMP(3),
  "nextChargeAmount" DECIMAL(10,2),
  "cancelBefore" TIMESTAMP(3),
  "paymentMethodAttached" BOOLEAN NOT NULL DEFAULT false,
  "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activatedAt" TIMESTAMP(3),
  "convertedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "expiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromoRedemption_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PromoRedemption_amounts_check"
    CHECK (
      "originalAmount" >= 0
      AND "discountAmount" >= 0
      AND "firstChargeAmount" >= 0
      AND "discountAmount" <= "originalAmount"
    )
);

CREATE TABLE "PromoAuditEvent" (
  "id" TEXT NOT NULL,
  "promoCampaignId" TEXT NOT NULL,
  "promoRedemptionId" TEXT,
  "actorUserId" TEXT,
  "actorEmail" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromoAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PromoCampaign_code_key" ON "PromoCampaign"("code");
CREATE UNIQUE INDEX "PromoRedemption_idempotencyKey_key" ON "PromoRedemption"("idempotencyKey");
CREATE INDEX "PromoCampaign_status_startsAt_endsAt_idx" ON "PromoCampaign"("status", "startsAt", "endsAt");
CREATE INDEX "PromoCampaign_createdAt_idx" ON "PromoCampaign"("createdAt");
CREATE INDEX "PromoRedemption_promoCampaignId_userId_idx" ON "PromoRedemption"("promoCampaignId", "userId");
CREATE INDEX "PromoRedemption_userId_status_idx" ON "PromoRedemption"("userId", "status");
CREATE INDEX "PromoRedemption_workspaceId_status_idx" ON "PromoRedemption"("workspaceId", "status");
CREATE INDEX "PromoRedemption_status_nextChargeAt_idx" ON "PromoRedemption"("status", "nextChargeAt");
CREATE INDEX "PromoAuditEvent_promoCampaignId_createdAt_idx" ON "PromoAuditEvent"("promoCampaignId", "createdAt");
CREATE INDEX "PromoAuditEvent_promoRedemptionId_createdAt_idx" ON "PromoAuditEvent"("promoRedemptionId", "createdAt");
CREATE INDEX "PromoAuditEvent_actorEmail_createdAt_idx" ON "PromoAuditEvent"("actorEmail", "createdAt");

ALTER TABLE "PromoRedemption"
ADD CONSTRAINT "PromoRedemption_promoCampaignId_fkey"
FOREIGN KEY ("promoCampaignId") REFERENCES "PromoCampaign"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PromoAuditEvent"
ADD CONSTRAINT "PromoAuditEvent_promoCampaignId_fkey"
FOREIGN KEY ("promoCampaignId") REFERENCES "PromoCampaign"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PromoAuditEvent"
ADD CONSTRAINT "PromoAuditEvent_promoRedemptionId_fkey"
FOREIGN KEY ("promoRedemptionId") REFERENCES "PromoRedemption"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Audit rows are append-only even for a database role with table UPDATE/DELETE.
CREATE FUNCTION "prevent_promo_audit_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'PromoAuditEvent rows are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PromoAuditEvent_immutable"
BEFORE UPDATE OR DELETE ON "PromoAuditEvent"
FOR EACH ROW EXECUTE FUNCTION "prevent_promo_audit_mutation"();

-- Redemption lifecycle fields may advance, but the historical row cannot vanish.
CREATE FUNCTION "prevent_promo_redemption_delete"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'PromoRedemption rows cannot be deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PromoRedemption_no_delete"
BEFORE DELETE ON "PromoRedemption"
FOR EACH ROW EXECUTE FUNCTION "prevent_promo_redemption_delete"();

-- CUBA14 is installed disabled. Super Admin must review dates and enable it.
INSERT INTO "PromoCampaign" (
  "id", "code", "name", "description", "type", "status",
  "firstChargeBehavior", "discountValue", "freeTrialDays", "currency",
  "applicablePlans", "startsAt", "endsAt", "totalRedemptionLimit",
  "perUserRedemptionLimit", "newUsersOnly", "requiresPaymentMethod",
  "autoConvert", "createdByEmail", "updatedByEmail", "updatedAt"
) VALUES (
  'promo_cuba14', 'CUBA14', 'CUBA14 New User Trial',
  '14-day free trial; one redemption per new user.',
  'FREE_TRIAL_DAYS', 'DISABLED', 'DEFER_UNTIL_TRIAL_END', 0, 14, 'MYR',
  ARRAY['PERSONAL_PRO', 'FAMILY', 'BUSINESS'],
  '2026-08-11T00:00:00.000Z', '2027-08-11T00:00:00.000Z', NULL,
  1, true, true, true, 'system@imai.my', 'system@imai.my', CURRENT_TIMESTAMP
);

INSERT INTO "PromoAuditEvent" (
  "id", "promoCampaignId", "actorEmail", "action", "after"
) VALUES (
  'promo_audit_cuba14_created', 'promo_cuba14', 'system@imai.my',
  'CAMPAIGN_CREATED', '{"seeded":true,"status":"DISABLED"}'::jsonb
);

COMMIT;
