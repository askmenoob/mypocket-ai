import assert from "node:assert/strict";
import test from "node:test";
import {
  isChipPlanDowngrade,
  resolveChipAccessPlan,
} from "../../web/src/chip-billing-plan-modal.js";

test("an active provider-neutral billing plan is the current access plan", () => {
  assert.equal(
    resolveChipAccessPlan({
      billingPlan:"BUSINESS",
      accessState:"ACTIVE",
      legacyPlan:"FAMILY",
    }),
    "BUSINESS",
  );
});

test("a new pending checkout does not claim paid access", () => {
  assert.equal(
    resolveChipAccessPlan({
      billingPlan:"FAMILY",
      accessState:"PENDING",
      legacyPlan:"FREE",
    }),
    "FREE",
  );
});

test("a suspended subscription retains its plan identity", () => {
  assert.equal(
    resolveChipAccessPlan({
      billingPlan:"FAMILY",
      accessState:"SUSPENDED",
      legacyPlan:"FREE",
    }),
    "FAMILY",
  );
});

test("a canceled legacy billing row does not turn the same access plan into a downgrade", () => {
  assert.equal(isChipPlanDowngrade("FAMILY", "FAMILY"), false);
  assert.equal(isChipPlanDowngrade("FAMILY", "BUSINESS"), false);
  assert.equal(isChipPlanDowngrade("BUSINESS", "FAMILY"), true);
});
