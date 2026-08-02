-- Add configurable WhatsApp bot alias per workspace instance.
ALTER TABLE "WhatsAppInstance"
ADD COLUMN "botAlias" TEXT NOT NULL DEFAULT 'mypocket';
