import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { automaticRenewalChargeCutoff } from "../src/modules/billing/billing-plan.policy.js";

test("automatic renewal charges become eligible only at the exact due time", () => {
  const now = new Date("2026-09-01T00:00:00.000Z");

  assert.equal(automaticRenewalChargeCutoff(now).toISOString(), now.toISOString());

  const source = readFileSync(
    resolve(process.cwd(), "src/modules/billing/billing-lifecycle.scheduler.ts"),
    "utf8",
  );
  const paymentStart = source.slice(
    source.indexOf("private async startUpcomingPayments"),
    source.indexOf("private async createReminderDeliveries"),
  );

  assert.match(paymentStart, /dueAt:\s*\{\s*lte:\s*chargeCutoff\s*\}/u);
  assert.doesNotMatch(paymentStart, /30\s*\*\s*DAY_MS/u);
});
