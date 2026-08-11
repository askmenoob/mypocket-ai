import assert from "node:assert/strict";
import test from "node:test";

import { PromotionService } from "../src/modules/promotion/promotion.service.js";

function fixture(serializationConflicts = 0){
  const campaign = {
    id:"campaign-1",
    code:"CUBA14",
    name:"CUBA14",
    description:null,
    type:"FREE_TRIAL_DAYS",
    status:"ENABLED",
    firstChargeBehavior:"DEFER_UNTIL_TRIAL_END",
    discountValue:0,
    freeTrialDays:14,
    currency:"MYR",
    applicablePlans:["FAMILY"],
    startsAt:new Date("2026-01-01T00:00:00.000Z"),
    endsAt:new Date("2099-01-01T00:00:00.000Z"),
    totalRedemptionLimit:null,
    perUserRedemptionLimit:1,
    newUsersOnly:false,
    requiresPaymentMethod:true,
    autoConvert:true,
    archivedAt:null,
    createdByEmail:"system@imai.my",
    updatedByEmail:"system@imai.my",
    createdAt:new Date("2026-01-01T00:00:00.000Z"),
    updatedAt:new Date("2026-01-01T00:00:00.000Z"),
  };
  const redemptions:any[] = [];
  const audits:any[] = [];
  const isolationLevels:string[] = [];
  let calls = 0;
  let transactionTail:Promise<unknown> = Promise.resolve();

  const tx:any = {
    promoCampaign:{ findUnique:async () => campaign },
    promoRedemption:{
      findUnique:async ({ where }:any) =>
        redemptions.find((item) => item.idempotencyKey === where.idempotencyKey) ?? null,
      count:async ({ where }:any) =>
        redemptions.filter((item) =>
          item.promoCampaignId === where.promoCampaignId
          && (!where.userId || item.userId === where.userId),
        ).length,
      create:async ({ data }:any) => {
        const now = new Date();
        const row = {
          id:`redemption-${redemptions.length + 1}`,
          ...data,
          redeemedAt:now,
          createdAt:now,
          updatedAt:now,
          convertedAt:null,
          cancelledAt:null,
          expiredAt:null,
        };
        redemptions.push(row);
        return row;
      },
      update:async () => { throw new Error("not used"); },
    },
    user:{
      findUnique:async ({ select }:any) =>
        select?.createdAt
          ? { createdAt:new Date("2026-06-01T00:00:00.000Z") }
          : { email:"new-user@example.com" },
    },
    workspaceBillingSubscription:{ count:async () => 0 },
    promoAuditEvent:{ create:async ({ data }:any) => { audits.push(data); return data; } },
  };

  const prisma:any = {
    ...tx,
    $transaction:async (callback:any, options:any) => {
      calls += 1;
      isolationLevels.push(options?.isolationLevel);
      if(serializationConflicts > 0){
        serializationConflicts -= 1;
        throw Object.assign(new Error("serialization conflict"), { code:"P2034" });
      }
      const run = transactionTail.then(() => callback(tx));
      transactionTail = run.catch(() => undefined);
      return run;
    },
  };

  return {
    service:new PromotionService({ prisma } as never),
    redemptions,
    audits,
    isolationLevels,
    calls:() => calls,
  };
}

const actor = {
  userId:"new-user",
  email:"new-user@example.com",
  workspaceId:"workspace-1",
};
const input = {
  code:"cuba14",
  plan:"FAMILY" as const,
  originalAmount:19,
  currency:"MYR" as const,
  paymentMethodAttached:true,
  idempotencyKey:"same-client-request-0001",
};

test("concurrent replay creates one redemption and one immutable audit event", async () => {
  const state = fixture();
  const results = await Promise.all([
    state.service.redeem(actor, input),
    state.service.redeem(actor, input),
  ]);

  assert.equal(state.redemptions.length, 1);
  assert.equal(state.audits.length, 1);
  assert.deepEqual(results.map((item) => item.replayed).sort(), [false, true]);
  assert.deepEqual(state.isolationLevels, ["Serializable", "Serializable"]);
});

test("serialization conflicts retry three times with the same idempotent request", async () => {
  const state = fixture(2);
  const result = await state.service.redeem(actor, input);
  assert.equal(result.replayed, false);
  assert.equal(state.calls(), 3);
  assert.equal(state.redemptions.length, 1);
  assert.equal(state.audits.length, 1);
});
