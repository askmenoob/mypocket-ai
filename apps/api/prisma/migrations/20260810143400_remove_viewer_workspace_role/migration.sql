-- Remove the legacy MyPocket workspace VIEWER role.
-- Valid workspace roles after this migration:
-- OWNER, ADMIN, MEMBER.
--
-- Safety:
-- - Abort if any VIEWER rows exist at deployment time.
-- - Preserve WorkspaceInvite.role and WorkspaceMember.role.
-- - Preserve NOT NULL through the type conversion.
-- - Restore MEMBER as the default after enum replacement.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "WorkspaceMember"
    WHERE role::text = 'VIEWER'
  )
  OR EXISTS (
    SELECT 1
    FROM "WorkspaceInvite"
    WHERE role::text = 'VIEWER'
  )
  THEN
    RAISE EXCEPTION
      'WorkspaceRole migration aborted: VIEWER rows still exist';
  END IF;
END
$$;

ALTER TABLE "WorkspaceInvite"
  ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "WorkspaceMember"
  ALTER COLUMN "role" DROP DEFAULT;

CREATE TYPE "WorkspaceRole_new"
  AS ENUM (
    'OWNER',
    'ADMIN',
    'MEMBER'
  );

ALTER TABLE "WorkspaceInvite"
  ALTER COLUMN "role"
  TYPE "WorkspaceRole_new"
  USING (
    "role"::text::"WorkspaceRole_new"
  );

ALTER TABLE "WorkspaceMember"
  ALTER COLUMN "role"
  TYPE "WorkspaceRole_new"
  USING (
    "role"::text::"WorkspaceRole_new"
  );

DROP TYPE "WorkspaceRole";

ALTER TYPE "WorkspaceRole_new"
  RENAME TO "WorkspaceRole";

ALTER TABLE "WorkspaceInvite"
  ALTER COLUMN "role"
  SET DEFAULT 'MEMBER'::"WorkspaceRole";

ALTER TABLE "WorkspaceMember"
  ALTER COLUMN "role"
  SET DEFAULT 'MEMBER'::"WorkspaceRole";

COMMIT;
