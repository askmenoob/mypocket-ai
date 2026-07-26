-- CreateTable
CREATE TABLE "GoogleTemplate" (
    "id" TEXT NOT NULL,
    "type" "WorkspaceType" NOT NULL,
    "name" TEXT NOT NULL,
    "spreadsheetId" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleTemplate_type_version_key" ON "GoogleTemplate"("type", "version");
