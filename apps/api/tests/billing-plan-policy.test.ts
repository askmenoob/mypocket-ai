import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRenewalSchedule,
  calculateProratedUpgrade,
  classifyPlanChange,
  computePlanQuote,
  deriveBillingAccessState,
  getReminderOffsetsDays,
} from "../src/modules/billing/billing-plan.policy.js";

test("1, 6 and 12 month prices match the approved MYR plan matrix", () => {
  const cases = [
    ["PERSONAL_PRO", "MONTHLY", 900],
    ["PERSONAL_PRO", "SIX_MONTHS", 5_400],
    ["PERSONAL_PRO", "YEARLY", 10_800],
    ["FAMILY", "MONTHLY", 1_900],
    ["FAMILY", "SIX_MONTHS", 11_400],
    ["FAMILY", "YEARLY", 22_800],
    ["BUSINESS", "MONTHLY", 4_900],
    ["BUSINESS", "SIX_MONTHS", 29_400],
    ["BUSINESS", "YEARLY", 58_800],
  ] as const;

  for (const [plan, interval, expectedBaseAmountSen] of cases) {
    const quote = computePlanQuote({
      plan,
      interval,
      annualDiscountPercent: "0",
    });
    assert.equal(quote.baseAmountSen, expectedBaseAmountSen);
    assert.equal(quote.amountDueSen, expectedBaseAmountSen);
    assert.equal(quote.currency, "MYR");
  }
});

test("annual percentage discount is yearly-only and rounds to whole sen", () => {
  const yearly = computePlanQuote({
    plan: "FAMILY",
    interval: "YEARLY",
    annualDiscountPercent: "12.50",
  });
  assert.deepEqual(yearly, {
    plan: "FAMILY",
    interval: "YEARLY",
    currency: "MYR",
    baseAmountSen: 22_800,
    annualDiscountBasisPoints: 1_250,
    discountAmountSen: 2_850,
    amountDueSen: 19_950,
  });

  const monthly = computePlanQuote({
    plan: "FAMILY",
    interval: "MONTHLY",
    annualDiscountPercent: "12.50",
  });
  assert.equal(monthly.discountAmountSen, 0);
  assert.equal(monthly.amountDueSen, 1_900);

  assert.throws(
    () =>
      computePlanQuote({
        plan: "BUSINESS",
        interval: "YEARLY",
        annualDiscountPercent: "100.01",
      }),
    /between 0 and 100/u,
  );
});

test("early renewal extends from paid-through date and clamps month ends", () => {
  const schedule = buildRenewalSchedule({
    paidAt: new Date("2026-01-15T10:30:00.000Z"),
    paidThroughAt: new Date("2026-01-31T10:30:00.000Z"),
    interval: "MONTHLY",
    plan: "PERSONAL_PRO",
  });

  assert.equal(schedule.coverageStart.toISOString(), "2026-01-31T10:30:00.000Z");
  assert.equal(schedule.coverageEnd.toISOString(), "2026-02-28T10:30:00.000Z");
  assert.equal(schedule.paymentDueAt.toISOString(), "2026-02-28T10:30:00.000Z");
  assert.equal(schedule.graceEndsAt.toISOString(), "2026-03-03T10:30:00.000Z");
});

test("Business gets 7 grace days; Personal and Family get 3", () => {
  const business = buildRenewalSchedule({
    paidAt: new Date("2026-08-12T00:00:00.000Z"),
    paidThroughAt: null,
    interval: "SIX_MONTHS",
    plan: "BUSINESS",
  });
  assert.equal(business.coverageEnd.toISOString(), "2027-02-12T00:00:00.000Z");
  assert.equal(business.graceEndsAt.toISOString(), "2027-02-19T00:00:00.000Z");

  const family = buildRenewalSchedule({
    paidAt: new Date("2026-08-12T00:00:00.000Z"),
    paidThroughAt: null,
    interval: "YEARLY",
    plan: "FAMILY",
  });
  assert.equal(family.coverageEnd.toISOString(), "2027-08-12T00:00:00.000Z");
  assert.equal(family.graceEndsAt.toISOString(), "2027-08-15T00:00:00.000Z");
});

test("warning offsets follow monthly versus long-term policy", () => {
  assert.deepEqual(getReminderOffsetsDays("MONTHLY"), [7, 3, 1, 0]);
  assert.deepEqual(getReminderOffsetsDays("SIX_MONTHS"), [30, 14, 7, 0]);
  assert.deepEqual(getReminderOffsetsDays("YEARLY"), [30, 14, 7, 0]);
});

test("access transitions ACTIVE to PAYMENT_DUE to GRACE to SUSPENDED", () => {
  const paymentDueAt = new Date("2026-09-01T00:00:00.000Z");
  const graceEndsAt = new Date("2026-09-04T00:00:00.000Z");

  assert.equal(
    deriveBillingAccessState({
      now: new Date("2026-08-31T23:59:59.999Z"),
      paymentDueAt,
      graceEndsAt,
    }),
    "ACTIVE",
  );
  assert.equal(
    deriveBillingAccessState({
      now: new Date("2026-09-01T12:00:00.000Z"),
      paymentDueAt,
      graceEndsAt,
    }),
    "PAYMENT_DUE",
  );
  assert.equal(
    deriveBillingAccessState({
      now: new Date("2026-09-02T00:00:00.000Z"),
      paymentDueAt,
      graceEndsAt,
    }),
    "GRACE",
  );
  assert.equal(
    deriveBillingAccessState({
      now: graceEndsAt,
      paymentDueAt,
      graceEndsAt,
    }),
    "SUSPENDED",
  );
});

test("upgrade proration charges only positive remaining-period difference", () => {
  assert.equal(classifyPlanChange("PERSONAL_PRO", "FAMILY"), "UPGRADE");
  assert.equal(classifyPlanChange("BUSINESS", "FAMILY"), "DOWNGRADE");
  assert.equal(classifyPlanChange("FAMILY", "FAMILY"), "SAME");

  const amountDueSen = calculateProratedUpgrade({
    currentPlan: "PERSONAL_PRO",
    targetPlan: "BUSINESS",
    interval: "MONTHLY",
    currentPeriodStart: new Date("2026-08-01T00:00:00.000Z"),
    currentPeriodEnd: new Date("2026-09-01T00:00:00.000Z"),
    now: new Date("2026-08-16T12:00:00.000Z"),
    annualDiscountPercent: "0",
  });

  assert.equal(amountDueSen, 2_000);
  assert.equal(
    calculateProratedUpgrade({
      currentPlan: "BUSINESS",
      targetPlan: "FAMILY",
      interval: "MONTHLY",
      currentPeriodStart: new Date("2026-08-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-09-01T00:00:00.000Z"),
      now: new Date("2026-08-16T12:00:00.000Z"),
      annualDiscountPercent: "0",
    }),
    0,
  );
});
