import { AppError } from "../../shared/errors/app-error.js";

export const BILLING_PLANS = [
  "PERSONAL_PRO",
  "FAMILY",
  "BUSINESS",
] as const;

export const BILLING_INTERVALS = [
  "MONTHLY",
  "SIX_MONTHS",
  "YEARLY",
] as const;

export type BillingPlan = (typeof BILLING_PLANS)[number];
export type BillingInterval = (typeof BILLING_INTERVALS)[number];
export type BillingAccessState =
  | "ACTIVE"
  | "PAYMENT_DUE"
  | "GRACE"
  | "SUSPENDED";

const PLAN_PRICE_SEN: Record<
  BillingPlan,
  Record<BillingInterval, number>
> = {
  PERSONAL_PRO: {
    MONTHLY: 900,
    SIX_MONTHS: 5_400,
    YEARLY: 10_800,
  },
  FAMILY: {
    MONTHLY: 1_900,
    SIX_MONTHS: 11_400,
    YEARLY: 22_800,
  },
  BUSINESS: {
    MONTHLY: 4_900,
    SIX_MONTHS: 29_400,
    YEARLY: 58_800,
  },
};

const PLAN_RANK: Record<BillingPlan, number> = {
  PERSONAL_PRO: 1,
  FAMILY: 2,
  BUSINESS: 3,
};

const INTERVAL_MONTHS: Record<BillingInterval, number> = {
  MONTHLY: 1,
  SIX_MONTHS: 6,
  YEARLY: 12,
};

const DAY_MS = 24 * 60 * 60 * 1_000;

const assertDate = (value: Date, field: string) => {
  if (!Number.isFinite(value.getTime())) {
    throw new AppError(
      "BILLING_DATE_INVALID",
      `${field} must be a valid date.`,
      400,
    );
  }
};

const parseAnnualDiscountBasisPoints = (value: string | number) => {
  const normalized = String(value).trim();

  if (!/^\d{1,3}(?:\.\d{1,2})?$/u.test(normalized)) {
    throw new AppError(
      "BILLING_DISCOUNT_INVALID",
      "Annual discount must be between 0 and 100 with at most two decimal places.",
      400,
    );
  }

  const [whole = "0", fractional = ""] = normalized.split(".");
  const basisPoints =
    Number.parseInt(whole, 10) * 100 +
    Number.parseInt(fractional.padEnd(2, "0") || "0", 10);

  if (basisPoints < 0 || basisPoints > 10_000) {
    throw new AppError(
      "BILLING_DISCOUNT_INVALID",
      "Annual discount must be between 0 and 100 with at most two decimal places.",
      400,
    );
  }

  return basisPoints;
};

const roundPercentageSen = (amountSen: number, basisPoints: number) =>
  Number(
    (BigInt(amountSen) * BigInt(basisPoints) + 5_000n) / 10_000n,
  );

export const computePlanQuote = (input: {
  plan: BillingPlan;
  interval: BillingInterval;
  annualDiscountPercent: string | number;
}) => {
  const baseAmountSen = PLAN_PRICE_SEN[input.plan][input.interval];
  const configuredBasisPoints = parseAnnualDiscountBasisPoints(
    input.annualDiscountPercent,
  );
  const annualDiscountBasisPoints =
    input.interval === "YEARLY" ? configuredBasisPoints : 0;
  const discountAmountSen = roundPercentageSen(
    baseAmountSen,
    annualDiscountBasisPoints,
  );

  return {
    plan: input.plan,
    interval: input.interval,
    currency: "MYR" as const,
    baseAmountSen,
    annualDiscountBasisPoints,
    discountAmountSen,
    amountDueSen: baseAmountSen - discountAmountSen,
  };
};

const addMonthsClampedUtc = (value: Date, months: number) => {
  assertDate(value, "date");

  const result = new Date(value.getTime());
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDayOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));

  return result;
};

export const getGraceDays = (plan: BillingPlan) =>
  plan === "BUSINESS" ? 7 : 3;

export const buildRenewalSchedule = (input: {
  paidAt: Date;
  paidThroughAt: Date | null;
  interval: BillingInterval;
  plan: BillingPlan;
}) => {
  assertDate(input.paidAt, "paidAt");
  if (input.paidThroughAt) {
    assertDate(input.paidThroughAt, "paidThroughAt");
  }

  const coverageStart = new Date(
    input.paidThroughAt && input.paidThroughAt > input.paidAt
      ? input.paidThroughAt.getTime()
      : input.paidAt.getTime(),
  );
  const coverageEnd = addMonthsClampedUtc(
    coverageStart,
    INTERVAL_MONTHS[input.interval],
  );
  const paymentDueAt = new Date(coverageEnd.getTime());
  const graceEndsAt = new Date(
    paymentDueAt.getTime() + getGraceDays(input.plan) * DAY_MS,
  );

  return {
    coverageStart,
    coverageEnd,
    paidThroughAt: new Date(coverageEnd.getTime()),
    nextRenewalAt: new Date(coverageEnd.getTime()),
    paymentDueAt,
    graceEndsAt,
  };
};

export const getReminderOffsetsDays = (interval: BillingInterval) =>
  interval === "MONTHLY" ? ([7, 3, 1, 0] as const) : ([30, 14, 7, 0] as const);

export const deriveBillingAccessState = (input: {
  now: Date;
  paymentDueAt: Date;
  graceEndsAt: Date;
}): BillingAccessState => {
  assertDate(input.now, "now");
  assertDate(input.paymentDueAt, "paymentDueAt");
  assertDate(input.graceEndsAt, "graceEndsAt");

  if (input.graceEndsAt < input.paymentDueAt) {
    throw new AppError(
      "BILLING_GRACE_INVALID",
      "Grace deadline cannot be before payment due date.",
      400,
    );
  }

  if (input.now < input.paymentDueAt) {
    return "ACTIVE";
  }
  if (input.now < new Date(input.paymentDueAt.getTime() + DAY_MS)) {
    return "PAYMENT_DUE";
  }
  if (input.now < input.graceEndsAt) {
    return "GRACE";
  }
  return "SUSPENDED";
};

export const classifyPlanChange = (
  currentPlan: BillingPlan,
  targetPlan: BillingPlan,
) => {
  if (currentPlan === targetPlan) {
    return "SAME" as const;
  }
  return PLAN_RANK[targetPlan] > PLAN_RANK[currentPlan]
    ? ("UPGRADE" as const)
    : ("DOWNGRADE" as const);
};

export const calculateProratedUpgrade = (input: {
  currentPlan: BillingPlan;
  targetPlan: BillingPlan;
  interval: BillingInterval;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  now: Date;
  annualDiscountPercent: string | number;
}) => {
  if (classifyPlanChange(input.currentPlan, input.targetPlan) !== "UPGRADE") {
    return 0;
  }

  assertDate(input.currentPeriodStart, "currentPeriodStart");
  assertDate(input.currentPeriodEnd, "currentPeriodEnd");
  assertDate(input.now, "now");

  const totalMs =
    input.currentPeriodEnd.getTime() - input.currentPeriodStart.getTime();
  const remainingMs = Math.max(
    0,
    input.currentPeriodEnd.getTime() -
      Math.max(input.now.getTime(), input.currentPeriodStart.getTime()),
  );

  if (totalMs <= 0 || remainingMs <= 0) {
    return 0;
  }

  const currentQuote = computePlanQuote({
    plan: input.currentPlan,
    interval: input.interval,
    annualDiscountPercent: input.annualDiscountPercent,
  });
  const targetQuote = computePlanQuote({
    plan: input.targetPlan,
    interval: input.interval,
    annualDiscountPercent: input.annualDiscountPercent,
  });
  const differenceSen = Math.max(
    0,
    targetQuote.amountDueSen - currentQuote.amountDueSen,
  );

  return Number(
    (BigInt(differenceSen) * BigInt(remainingMs) + BigInt(totalMs) / 2n) /
      BigInt(totalMs),
  );
};

export const automaticRenewalChargeCutoff = (now: Date) => {
  assertDate(now, "now");
  return new Date(now.getTime());
};
