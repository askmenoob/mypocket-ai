import test from "node:test";
import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

const read =
  (path:string) =>
    readFileSync(
      path,
      "utf8",
    );

test(
  "workspace roles are OWNER ADMIN MEMBER only",
  () => {
    const schema =
      read(
        "prisma/schema.prisma",
      );

    const match =
      schema.match(
        /enum WorkspaceRole\s*\{([^}]*)\}/m,
      );

    assert.ok(match);

    const roles =
      match[1]
        .split(/\s+/)
        .map(
          value =>
            value.trim(),
        )
        .filter(Boolean);

    assert.deepEqual(
      roles,
      [
        "OWNER",
        "ADMIN",
        "MEMBER",
      ],
    );
  },
);

test(
  "runtime roles and permissions expose no VIEWER",
  () => {
    assert.doesNotMatch(
      read(
        "src/shared/auth/roles.ts",
      ),
      /VIEWER/,
    );

    assert.doesNotMatch(
      read(
        "src/shared/auth/permissions.ts",
      ),
      /VIEWER/,
    );
  },
);

test(
  "generated Prisma role enum exposes no VIEWER",
  () => {
    const enums =
      read(
        "src/generated/prisma/enums.ts",
      );

    assert.doesNotMatch(
      enums,
      /VIEWER/,
    );

    assert.match(enums, /OWNER/);
    assert.match(enums, /ADMIN/);
    assert.match(enums, /MEMBER/);
  },
);

test(
  "historical migration remains immutable",
  () => {
    assert.match(
      read(
        "prisma/migrations/20260718074230_add_workspace_membership/migration.sql",
      ),
      /VIEWER/,
    );
  },
);
