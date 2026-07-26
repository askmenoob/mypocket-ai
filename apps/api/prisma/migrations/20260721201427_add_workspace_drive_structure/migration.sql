-- AlterTable
ALTER TABLE "WorkspaceGoogleSetting" ADD COLUMN     "exportsFolderId" TEXT,
ADD COLUMN     "receiptsFolderId" TEXT,
ADD COLUMN     "reportsFolderId" TEXT,
ADD COLUMN     "rootFolderId" TEXT,
ADD COLUMN     "templateType" TEXT;
