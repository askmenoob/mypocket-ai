import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCampaignTransition,
  assertRedemptionTransition,
  buildPromotionDisclosure,
  calculateFirstCharge,
  evaluatePromotionEligibility,
  normalizePromotionCode,
  promotionIdempotencyKey,
} from "../src/modules/promotion/promotion.policy.js";

const now = new Date("2026-08-11T00:00:00.000Z");

const baseCampaign = {
  id: "promo-cuba14",
  code: "CUBA14",
  status: "ENABLED" as const,
  type: "FREE_TRIAL_DAYS" as const,
  firstChargeBehavior: "DEFER_UNTIL_TRIAL_END" as const,
  discountValue: 0,
  freeTrialDays: 14,
  applicablePlans: ["PERSONAL_PRO", "FAMILY", "BUSINESS"],
  startsAt: new Date("2026-08-01T00:00:00.000Z"),
  endsAt: new Date("2026-09-01T00:00:00.000Z"),
  totalRedemptionLimit: null,
  perUserRedemptionLimit: 1,
  newUsersOnly: true,
  requiresPaymentMethod: true,
  autoConvert: true,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
};

test("CUBA14 accepts an eligible new user and discloses conversion", () => {
  const result = evaluatePromotionEligibility({
    campaign: baseCampaign,
    now,
    requestedPlan: "FAMILY",
    totalRedemptions: 20,
    userRedemptions: 0,
    userCreatedAt: new Date("2026-08-05T00:00:00.000Z"),
    hasPriorPaidSubscription: false,
    paymentMethodAttached: true,
  });

  assert.deepEqual(result, { eligible: true, reasons: [] });

  const disclosure = buildPromotionDisclosure({
    campaign: baseCampaign,
    originalAmount: 19,
    currency: "MYR",
    now,
  });

  assert.equal(disclosure.firstChargeAmount, 0);
  assert.equal(disclosure.trialEndsAt, "2026-08-25T00:00:00.000Z");
  assert.equal(disclosure.nextChargeAt, "2026-08-25T00:00:00.000Z");
  assert.equal(disclosure.nextChargeAmount, 19);
  assert.equal(disclosure.cancelBefore, "2026-08-25T00:00:00.000Z");
  assert.match(disclosure.summary, /RM19\.00/);
});

test("eligibility rejects wrong plan, missing payment method, old or repeat user", () => {
  const result = evaluatePromotionEligibility({
    campaign: baseCampaign,
    now,
    requestedPlan: "PERSONAL",
    totalRedemptions: 20,
    userRedemptions: 1,
    userCreatedAt: new Date("2026-07-01T00:00:00.000Z"),
    hasPriorPaidSubscription: true,
    paymentMethodAttached: false,
  });

  assert.equal(result.eligible, false);
  assert.deepEqual(result.reasons, [
    "PLAN_NOT_APPLICABLE",
    "PER_USER_LIMIT_REACHED",
    "NEW_USERS_ONLY",
    "PAYMENT_METHOD_REQUIRED",
  ]);
});

test("validity, status and total limits fail closed", () => {
  const result = evaluatePromotionEligibility({
    campaign: {
      ...baseCampaign,
      status: "DISABLED",
      startsAt: new Date("2026-08-12T00:00:00.000Z"),
      endsAt: new Date("2026-08-10T23:59:59.999Z"),
      totalRedemptionLimit: 10,
    },
    now,
    requestedPlan: "FAMILY",
    totalRedemptions: 10,
    userRedemptions: 0,
    userCreatedAt: new Date("2026-08-05T00:00:00.000Z"),
    hasPriorPaidSubscription: false,
    paymentMethodAttached: true,
  });

  assert.equal(result.eligible, false);
  assert.deepEqual(result.reasons, [
    "CAMPAIGN_NOT_ENABLED",
    "CAMPAIGN_NOT_STARTED",
    "CAMPAIGN_EXPIRED",
    "TOTAL_LIMIT_REACHED",
  ]);
});

test("percentage and fixed promotions never produce a negative first charge", () => {
  assert.deepEqual(
    calculateFirstCharge("PERCENTAGE", 25, 19),
    { discountAmount: 4.75, firstChargeAmount: 14.25 },
  );
  assert.deepEqual(
    calculateFirstCharge("FIXED_AMOUNT", 50, 19),
    { discountAmount: 19, firstChargeAmount: 0 },
  );
});

test("campaign lifecycle blocks resurrection after expiry or archive", () => {
  assert.doesNotThrow(() => assertCampaignTransition("DRAFT", "ENABLED"));
  assert.doesNotThrow(() => assertCampaignTransition("ENABLED", "DISABLED"));
  assert.throws(
    () => assertCampaignTransition("EXPIRED", "ENABLED"),
    /PROMO_INVALID_STATUS_TRANSITION/,
  );
  assert.throws(
    () => assertCampaignTransition("ARCHIVED", "ENABLED"),
    /PROMO_INVALID_STATUS_TRANSITION/,
  );
});

test("redemption lifecycle allows activation and conversion but keeps final states final", () => {
  assert.doesNotThrow(() => assertRedemptionTransition("RESERVED", "ACTIVE"));
  assert.doesNotThrow(() => assertRedemptionTransition("ACTIVE", "CONVERTED"));
  assert.throws(
    () => assertRedemptionTransition("CONVERTED", "CANCELLED"),
    /PROMO_INVALID_REDEMPTION_TRANSITION/,
  );
  assert.throws(
    () => assertRedemptionTransition("CANCELLED", "ACTIVE"),
    /PROMO_INVALID_REDEMPTION_TRANSITION/,
  );
});

test("normalization and idempotency are stable without exposing client keys", () => {
  assert.equal(normalizePromotionCode(" cuba-14 "), "CUBA-14");
  const first = promotionIdempotencyKey("user-1", "promo-1", "request-1");
  const second = promotionIdempotencyKey("user-1", "promo-1", "request-1");
  assert.equal(first, second);
  assert.equal(first.length, 64);
  assert.doesNotMatch(first, /request-1/);
});
