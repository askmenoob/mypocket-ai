ALTER TABLE "WorkspaceBillingSubscription"
ADD COLUMN "pendingPlan" TEXT,
ADD COLUMN "pendingProviderPlanId" TEXT,
ADD COLUMN "planChangeRequestedAt" TIMESTAMP(3);
