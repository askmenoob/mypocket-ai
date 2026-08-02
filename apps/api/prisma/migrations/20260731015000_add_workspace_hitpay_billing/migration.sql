BEGIN;

-- CreateTable
CREATE TABLE "WorkspaceBillingSubscription" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'HITPAY',
    "providerPlanId" TEXT NOT NULL,
    "providerSubscriptionId" TEXT,
    "checkoutReference" TEXT,
    "checkoutUrl" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "lastPaymentAt" TIMESTAMP(3),
    "lastPaymentStatus" TEXT,
    "canceledAt" TIMESTAMP(3),
    "lastWebhookAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceBillingSubscription_pkey"
    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingWebhookEvent" (
    "id" TEXT NOT NULL,
    "workspaceBillingSubscriptionId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'HITPAY',
    "eventKey" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "eventObject" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "externalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingWebhookEvent_pkey"
    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX
"WorkspaceBillingSubscription_workspaceId_key"
ON "WorkspaceBillingSubscription"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX
"WorkspaceBillingSubscription_providerSubscriptionId_key"
ON "WorkspaceBillingSubscription"("providerSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX
"WorkspaceBillingSubscription_checkoutReference_key"
ON "WorkspaceBillingSubscription"("checkoutReference");

-- CreateIndex
CREATE INDEX
"WorkspaceBillingSubscription_ownerUserId_idx"
ON "WorkspaceBillingSubscription"("ownerUserId");

-- CreateIndex
CREATE INDEX
"WorkspaceBillingSubscription_plan_status_idx"
ON "WorkspaceBillingSubscription"("plan", "status");

-- CreateIndex
CREATE UNIQUE INDEX
"BillingWebhookEvent_eventKey_key"
ON "BillingWebhookEvent"("eventKey");

-- CreateIndex
CREATE INDEX
"BillingWebhookEvent_workspaceBillingSubscriptionId_idx"
ON "BillingWebhookEvent"("workspaceBillingSubscriptionId");

-- CreateIndex
CREATE INDEX
"BillingWebhookEvent_eventObject_eventType_idx"
ON "BillingWebhookEvent"("eventObject", "eventType");

-- CreateIndex
CREATE INDEX
"BillingWebhookEvent_externalId_idx"
ON "BillingWebhookEvent"("externalId");

-- AddForeignKey
ALTER TABLE "WorkspaceBillingSubscription"
ADD CONSTRAINT "WorkspaceBillingSubscription_workspaceId_fkey"
FOREIGN KEY ("workspaceId")
REFERENCES "Workspace"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceBillingSubscription"
ADD CONSTRAINT "WorkspaceBillingSubscription_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingWebhookEvent"
ADD CONSTRAINT "BillingWebhookEvent_workspaceBillingSubscriptionId_fkey"
FOREIGN KEY ("workspaceBillingSubscriptionId")
REFERENCES "WorkspaceBillingSubscription"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

COMMIT;
