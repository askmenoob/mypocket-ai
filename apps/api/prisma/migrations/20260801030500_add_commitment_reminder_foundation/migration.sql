BEGIN;

-- Sprint A: commitment and reminder status enums.
CREATE TYPE "MonthlyCommitmentStatus" AS ENUM (
    'PENDING',
    'PAID',
    'OVERDUE',
    'SKIPPED'
);

CREATE TYPE "CommitmentReminderDeliveryKind" AS ENUM (
    'DUE',
    'OVERDUE'
);

CREATE TYPE "CommitmentReminderDeliveryStatus" AS ENUM (
    'PENDING',
    'SENDING',
    'SENT',
    'FAILED',
    'UNKNOWN',
    'CANCELLED'
);

-- Workspace-level settings shared by dashboard, WhatsApp and scheduler.
CREATE TABLE "WorkspaceBotSettings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "botEnabled" BOOLEAN NOT NULL DEFAULT true,
    "replyLanguage" TEXT NOT NULL DEFAULT 'ms',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
    "defaultReminderDaysBefore" INTEGER NOT NULL DEFAULT 2,
    "defaultReminderTime" TEXT NOT NULL DEFAULT '09:00',
    "quietHoursStart" TEXT NOT NULL DEFAULT '22:00',
    "quietHoursEnd" TEXT NOT NULL DEFAULT '08:00',
    "overdueReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappNotificationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceBotSettings_pkey"
    PRIMARY KEY ("id")
);

-- Reusable monthly commitment template.
CREATE TABLE "Commitment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MYR',
    "dueDay" INTEGER NOT NULL,
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 2,
    "reminderTime" TEXT NOT NULL DEFAULT '09:00',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commitment_pkey"
    PRIMARY KEY ("id"),

    CONSTRAINT "Commitment_dueDay_check"
    CHECK ("dueDay" BETWEEN 1 AND 31),

    CONSTRAINT "Commitment_reminderDaysBefore_check"
    CHECK ("reminderDaysBefore" BETWEEN 0 AND 31)
);

-- One immutable monthly occurrence per commitment and calendar month.
CREATE TABLE "MonthlyCommitmentInstance" (
    "id" TEXT NOT NULL,
    "commitmentId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "MonthlyCommitmentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "lastReminderKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyCommitmentInstance_pkey"
    PRIMARY KEY ("id"),

    CONSTRAINT "MonthlyCommitmentInstance_periodMonth_check"
    CHECK ("periodMonth" BETWEEN 1 AND 12)
);

-- Persistent, retryable and idempotent outbound reminder record.
CREATE TABLE "CommitmentReminderDelivery" (
    "id" TEXT NOT NULL,
    "monthlyCommitmentId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" "CommitmentReminderDeliveryKind" NOT NULL,
    "status" "CommitmentReminderDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "nextAttemptAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "claimedAt" TIMESTAMP(3),
    "claimToken" TEXT,
    "claimExpiresAt" TIMESTAMP(3),
    "recipientPhone" TEXT,
    "providerMessageId" TEXT,
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommitmentReminderDelivery_pkey"
    PRIMARY KEY ("id"),

    CONSTRAINT "CommitmentReminderDelivery_attemptCount_check"
    CHECK ("attemptCount" >= 0),

    CONSTRAINT "CommitmentReminderDelivery_maxAttempts_check"
    CHECK ("maxAttempts" BETWEEN 1 AND 10)
);

-- Unique constraints.
CREATE UNIQUE INDEX
"WorkspaceBotSettings_workspaceId_key"
ON "WorkspaceBotSettings"("workspaceId");

CREATE UNIQUE INDEX
"MonthlyCommitmentInstance_commitment_period_key"
ON "MonthlyCommitmentInstance"(
    "commitmentId",
    "periodYear",
    "periodMonth"
);

CREATE UNIQUE INDEX
"CommitmentReminderDelivery_idempotencyKey_key"
ON "CommitmentReminderDelivery"("idempotencyKey");

CREATE UNIQUE INDEX
"CommitmentReminderDelivery_instance_kind_key"
ON "CommitmentReminderDelivery"(
    "monthlyCommitmentId",
    "kind"
);

-- Query indexes.
CREATE INDEX
"Commitment_workspace_active_archive_idx"
ON "Commitment"(
    "workspaceId",
    "isActive",
    "archivedAt"
);

CREATE INDEX
"Commitment_workspace_name_idx"
ON "Commitment"(
    "workspaceId",
    "name"
);

CREATE INDEX
"Commitment_ownerUserId_idx"
ON "Commitment"("ownerUserId");

CREATE INDEX
"MonthlyCommitment_workspace_status_due_idx"
ON "MonthlyCommitmentInstance"(
    "workspaceId",
    "status",
    "dueDate"
);

CREATE INDEX
"MonthlyCommitment_workspace_period_status_idx"
ON "MonthlyCommitmentInstance"(
    "workspaceId",
    "periodYear",
    "periodMonth",
    "status"
);

CREATE INDEX
"ReminderDelivery_workspace_status_idx"
ON "CommitmentReminderDelivery"(
    "workspaceId",
    "status"
);

CREATE INDEX
"ReminderDelivery_schedule_retry_idx"
ON "CommitmentReminderDelivery"(
    "status",
    "scheduledFor",
    "nextAttemptAt"
);

CREATE INDEX
"ReminderDelivery_claimExpiresAt_idx"
ON "CommitmentReminderDelivery"("claimExpiresAt");

-- Foreign keys.
ALTER TABLE "WorkspaceBotSettings"
ADD CONSTRAINT "WorkspaceBotSettings_workspaceId_fkey"
FOREIGN KEY ("workspaceId")
REFERENCES "Workspace"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "Commitment"
ADD CONSTRAINT "Commitment_workspaceId_fkey"
FOREIGN KEY ("workspaceId")
REFERENCES "Workspace"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "MonthlyCommitmentInstance"
ADD CONSTRAINT "MonthlyCommitmentInstance_commitmentId_fkey"
FOREIGN KEY ("commitmentId")
REFERENCES "Commitment"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "MonthlyCommitmentInstance"
ADD CONSTRAINT "MonthlyCommitmentInstance_workspaceId_fkey"
FOREIGN KEY ("workspaceId")
REFERENCES "Workspace"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "CommitmentReminderDelivery"
ADD CONSTRAINT "CommitmentReminderDelivery_monthlyCommitmentId_fkey"
FOREIGN KEY ("monthlyCommitmentId")
REFERENCES "MonthlyCommitmentInstance"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "CommitmentReminderDelivery"
ADD CONSTRAINT "CommitmentReminderDelivery_workspaceId_fkey"
FOREIGN KEY ("workspaceId")
REFERENCES "Workspace"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

COMMIT;
