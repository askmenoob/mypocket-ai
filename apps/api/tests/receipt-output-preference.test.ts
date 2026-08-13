import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  botSettingsSchema,
} from "../src/modules/commitment/commitment.schemas.js";

import {
  CommitmentService,
} from "../src/modules/commitment/commitment.service.js";


test("bot settings accept an explicit receipt PDF preference", () => {
  assert.deepEqual(
    botSettingsSchema.parse({receiptPdfEnabled:false}),
    {receiptPdfEnabled:false},
  );
});


test("receipt format migration is additive and defaults existing workspaces to PDF", async () => {
  const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
  const migration = await readFile(
    new URL("../prisma/migrations/20260814090000_add_receipt_pdf_preference/migration.sql", import.meta.url),
    "utf8",
  );

  assert.match(schema, /receiptPdfEnabled\s+Boolean\s+@default\(true\)/);
  assert.match(migration, /ADD COLUMN\s+"receiptPdfEnabled"\s+BOOLEAN NOT NULL DEFAULT true/i);
  assert.doesNotMatch(migration, /\b(?:DROP|DELETE|TRUNCATE)\b/i);
});


test("only workspace Owner/Admin can persist the receipt format preference", async () => {
  let role = "OWNER";
  let upsertInput:any = null;
  const service = new CommitmentService({
    prisma:{
      workspaceMember:{
        findFirst:async () => ({role}),
      },
      workspaceBotSettings:{
        upsert:async (input:any) => {
          upsertInput = input;
          return input.update;
        },
      },
    },
  } as any);
  const actor = {
    userId:"user-1",
    workspaceId:"workspace-1",
    role:"OWNER",
  };

  await service.updateBotSettings(actor, {receiptPdfEnabled:false});
  assert.equal(upsertInput.create.receiptPdfEnabled, false);
  assert.equal(upsertInput.update.receiptPdfEnabled, false);

  role = "MEMBER";
  await assert.rejects(
    service.updateBotSettings(actor, {receiptPdfEnabled:true}),
    /Only Owner\/Admin can update bot settings/,
  );
});
