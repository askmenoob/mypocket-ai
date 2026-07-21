-- CreateEnum
CREATE TYPE "GoogleSheetMode" AS ENUM ('AUTO_CREATED', 'EXISTING_SHEET');

-- CreateTable
CREATE TABLE "WorkspaceGoogleSetting" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "spreadsheetId" TEXT NOT NULL,
    "spreadsheetTitle" TEXT,
    "transactionSheet" TEXT NOT NULL DEFAULT 'Transactions',
    "dashboardSheet" TEXT,
    "mode" "GoogleSheetMode" NOT NULL DEFAULT 'AUTO_CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceGoogleSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceGoogleSetting_workspaceId_key" ON "WorkspaceGoogleSetting"("workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspaceGoogleSetting" ADD CONSTRAINT "WorkspaceGoogleSetting_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
