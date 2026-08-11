import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CreatePromotionCampaignSchema,
} from "../src/modules/promotion/promotion.schemas.js";

test("CUBA14 schema accepts the required 14-day controlled trial", () => {
  const parsed = CreatePromotionCampaignSchema.parse({
    code:"cuba14",
    name:"CUBA14 New User Trial",
    description:"14-day trial",
    type:"FREE_TRIAL_DAYS",
    firstChargeBehavior:"DEFER_UNTIL_TRIAL_END",
    discountValue:0,
    freeTrialDays:14,
    currency:"MYR",
    applicablePlans:["PERSONAL_PRO", "FAMILY", "BUSINESS", "FAMILY"],
    startsAt:"2026-08-11T00:00:00.000Z",
    endsAt:"2027-08-11T00:00:00.000Z",
    totalRedemptionLimit:null,
    perUserRedemptionLimit:1,
    newUsersOnly:true,
    requiresPaymentMethod:true,
    autoConvert:true,
  });

  assert.equal(parsed.code, "CUBA14");
  assert.equal(parsed.freeTrialDays, 14);
  assert.deepEqual(parsed.applicablePlans, ["PERSONAL_PRO", "FAMILY", "BUSINESS"]);
});

test("campaign schema rejects incoherent discount and trial combinations", () => {
  const result = CreatePromotionCampaignSchema.safeParse({
    code:"BAD50",
    name:"Bad promotion",
    type:"PERCENTAGE",
    firstChargeBehavior:"DEFER_UNTIL_TRIAL_END",
    discountValue:150,
    freeTrialDays:14,
    currency:"MYR",
    applicablePlans:["FAMILY"],
    startsAt:"2026-08-12T00:00:00.000Z",
    endsAt:"2026-08-11T00:00:00.000Z",
    totalRedemptionLimit:0,
    perUserRedemptionLimit:0,
    newUsersOnly:false,
    requiresPaymentMethod:false,
    autoConvert:false,
  });
  assert.equal(result.success, false);
});

test("migration installs disabled CUBA14, immutable audit and no HitPay dependency", () => {
  const migration = readFileSync(
    new URL("../prisma/migrations/20260811103000_add_promotion_controls/migration.sql", import.meta.url),
    "utf8",
  );
  const routes = readFileSync(
    new URL("../src/modules/promotion/promotion.routes.ts", import.meta.url),
    "utf8",
  );
  const service = readFileSync(
    new URL("../src/modules/promotion/promotion.service.ts", import.meta.url),
    "utf8",
  );

  assert.match(migration, /'CUBA14'/u);
  assert.match(migration, /'DISABLED'/u);
  assert.match(migration, /PromoAuditEvent_immutable/u);
  assert.match(migration, /PromoRedemption_no_delete/u);
  assert.match(migration, /perUserRedemptionLimit/u);
  assert.match(routes, /\[app\.authenticate, requireSuperAdmin\]/u);
  assert.doesNotMatch(`${routes}\n${service}`, /hitpay|hit-pay/iu);
});
