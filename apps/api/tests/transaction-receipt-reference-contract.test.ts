import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
} from "node:fs";
import test from "node:test";


const read =
  (path:string) =>
    readFileSync(
      new URL(
        path,
        import.meta.url,
      ),
      "utf8",
    );


test(
  "receipt reference is persisted and exposed on the transaction dashboard",
  () => {
    const schema =
      read(
        "../prisma/schema.prisma",
      );
    const web =
      read(
        "../../web/src/app-bootstrap.tsx",
      );

    assert.match(
      schema,
      /model Transaction[\s\S]*receiptReference\s+String\?/,
    );
    assert.match(
      web,
      /receiptReference\?:string \| null/,
    );
    assert.match(
      web,
      /receiptReference:"Receipt reference"/,
    );
    assert.match(
      web,
      /receiptReference:"Rujukan resit"/,
    );
    assert.match(
      web,
      /item\.receiptReference \|\| "-"/,
    );
  },
);


test(
  "receipt reference migration and Google Sheet column are additive",
  () => {
    const migrationPath =
      new URL(
        "../prisma/migrations/20260811163000_add_transaction_receipt_reference/migration.sql",
        import.meta.url,
      );

    assert.equal(
      existsSync(migrationPath),
      true,
    );

    const migration =
      readFileSync(
        migrationPath,
        "utf8",
      );
    const initializer =
      read(
        "../src/modules/google/initializer/sheet-initializer.service.ts",
      );

    assert.match(
      migration,
      /ADD COLUMN\s+"receiptReference" TEXT/i,
    );
    assert.doesNotMatch(
      migration,
      /DROP|DELETE|TRUNCATE/i,
    );
    assert.match(
      initializer,
      /Transactions!A1:P1/,
    );
    assert.match(
      initializer,
      /"Receipt Reference"/,
    );
  },
);
