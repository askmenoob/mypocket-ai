ALTER TABLE "WorkspaceMember"
ADD COLUMN "whatsappPhoneNumber" TEXT;

CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_whatsappPhoneNumber_key"
ON "WorkspaceMember"("workspaceId", "whatsappPhoneNumber");
