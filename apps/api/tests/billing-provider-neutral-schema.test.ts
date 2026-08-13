import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const apiRoot = process.cwd();
const schemaPath = join(apiRoot, "prisma", "schema.prisma");
const migrationPath = join(
  apiRoot,
  "prisma",
  "migrations",
  "20260812043000_add_provider_neutral_billing",
  "migration.sql",
);
const webhookOrderingMigrationPath = join(
  apiRoot,
  "prisma",
  "migrations",
  "20260813090000_harden_chip_webhook_ordering",
  "migration.sql",
);

test("billing schema exposes provider-neutral subscription state", () => {
  const schema = readFileSync(schemaPath, "utf8");

  for (const enumName of [
    "BillingInterval",
    "BillingRenewalMethod",
    "BillingAccessState",
    "BillingPaymentAttemptStatus",
    "BillingRenewalStatus",
  ]) {
    assert.match(schema, new RegExp(`enum ${enumName} \\{`, "u"));
  }

  assert.match(schema, /billingInterval\s+BillingInterval\s+@default\(MONTHLY\)/u);
  assert.match(schema, /renewalMethod\s+BillingRenewalMethod\s+@default\(AUTOMATIC\)/u);
  assert.match(schema, /accessState\s+BillingAccessState\s+@default\(PENDING\)/u);
  assert.match(schema, /paidThroughAt\s+DateTime\?/u);
  assert.match(schema, /nextRenewalAt\s+DateTime\?/u);
  assert.match(schema, /graceEndsAt\s+DateTime\?/u);
  assert.match(schema, /suspendedAt\s+DateTime\?/u);
  assert.match(schema, /providerLastEventAt\s+DateTime\?/u);
});

test("webhook ordering migration is additive and preserves existing billing rows", () => {
  const migration = readFileSync(webhookOrderingMigrationPath, "utf8");

  assert.match(
    migration,
    /ALTER TABLE "WorkspaceBillingSubscription"[\s\S]+ADD COLUMN "providerLastEventAt" TIMESTAMP\(3\)/u,
  );
  assert.doesNotMatch(migration, /DROP\s+(?:TABLE|COLUMN|TYPE)/iu);
  assert.doesNotMatch(migration, /DELETE\s+FROM|TRUNCATE\s+TABLE/iu);
});

test("billing schema has idempotent payment, renewal, reminder and settings records", () => {
  const schema = readFileSync(schemaPath, "utf8");

  for (const modelName of [
    "BillingRecurringToken",
    "BillingPaymentAttempt",
    "BillingRenewal",
    "BillingReminderDelivery",
    "BillingSettings",
    "BillingSettingsAuditEvent",
  ]) {
    assert.match(schema, new RegExp(`model ${modelName} \\{`, "u"));
  }

  assert.match(schema, /idempotencyKey\s+String\s+@unique/u);
  assert.match(schema, /dedupeKey\s+String\s+@unique/u);
  assert.match(schema, /annualDiscountPercent\s+Decimal/u);
  assert.match(schema, /personalFamilyGraceDays\s+Int\s+@default\(3\)/u);
  assert.match(schema, /businessGraceDays\s+Int\s+@default\(7\)/u);
});

test("migration is additive, constrained and preserves legacy HitPay history", () => {
  const migration = readFileSync(migrationPath, "utf8");

  assert.doesNotMatch(migration, /DROP\s+(?:TABLE|COLUMN|TYPE)/iu);
  assert.match(migration, /CREATE TYPE "BillingInterval"/u);
  assert.match(migration, /ADD COLUMN\s+"billingInterval"/u);
  assert.match(migration, /UPDATE "WorkspaceBillingSubscription"[\s\S]+"currentPeriodEnd"/u);
  assert.match(migration, /CREATE TABLE "BillingPaymentAttempt"/u);
  assert.match(migration, /BillingSettings_discount_percent_check/u);
  assert.match(migration, /BillingPaymentAttempt_amounts_check/u);
  assert.match(migration, /BillingSettingsAuditEvent_immutable/u);
  assert.doesNotMatch(migration, /UPDATE[\s\S]+provider"\s*=\s*'CHIP'/iu);
});
