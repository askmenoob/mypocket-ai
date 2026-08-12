import assert from "node:assert/strict";
import test from "node:test";

import { PromotionService } from "../src/modules/promotion/promotion.service.js";

test("legacy direct redemption fails closed before any database write", async () => {
  let transactionCalls = 0;
  const service = new PromotionService({
    prisma:{
      $transaction:async () => {
        transactionCalls += 1;
        throw new Error("database must not be reached");
      },
    },
  } as never);

  await assert.rejects(
    service.redeem(
      { userId:"user-1", email:"user@example.com", workspaceId:"workspace-1" },
      {
        code:"CUBA14",
        plan:"FAMILY",
        originalAmount:19,
        currency:"MYR",
        paymentMethodAttached:true,
        idempotencyKey:"legacy-direct-redemption",
      },
    ),
    (error:any) => error?.code === "PROMO_CHECKOUT_REQUIRED" && error?.statusCode === 409,
  );
  assert.equal(transactionCalls, 0);
});
