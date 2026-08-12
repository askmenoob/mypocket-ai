BEGIN;

ALTER TABLE "PromoRedemption"
ADD COLUMN "billingPaymentAttemptId" TEXT,
ADD COLUMN "conversionBillingRenewalId" TEXT;

CREATE UNIQUE INDEX "PromoRedemption_billingPaymentAttemptId_key"
ON "PromoRedemption"("billingPaymentAttemptId");

CREATE UNIQUE INDEX "PromoRedemption_conversionBillingRenewalId_key"
ON "PromoRedemption"("conversionBillingRenewalId");

ALTER TABLE "PromoRedemption"
ADD CONSTRAINT "PromoRedemption_billingPaymentAttemptId_fkey"
FOREIGN KEY ("billingPaymentAttemptId") REFERENCES "BillingPaymentAttempt"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PromoRedemption"
ADD CONSTRAINT "PromoRedemption_conversionBillingRenewalId_fkey"
FOREIGN KEY ("conversionBillingRenewalId") REFERENCES "BillingRenewal"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
