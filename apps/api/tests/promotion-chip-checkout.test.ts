import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { chipCheckoutSchema } from "../src/modules/billing/chip-billing.schemas.js";

test("CHIP checkout accepts a normalized optional promotion code", () => {
  const parsed = chipCheckoutSchema.parse({
    plan: "FAMILY",
    interval: "MONTHLY",
    renewalMethod: "AUTOMATIC",
    promoCode: " cuba14 ",
    requestId:"11111111-1111-4111-8111-111111111111",
  });

  assert.equal(parsed.promoCode, "CUBA14");
});

test("promotion redemption is tied one-to-one to the billing attempt", () => {
  const schema = readFileSync(
    new URL("../prisma/schema.prisma", import.meta.url),
    "utf8",
  );

  assert.match(schema, /billingPaymentAttemptId\s+String\?\s+@unique/u);
  assert.match(schema, /billingPaymentAttempt\s+BillingPaymentAttempt\?\s+@relation/u);
  assert.match(schema, /conversionBillingRenewalId\s+String\?\s+@unique/u);
  assert.match(schema, /conversionBillingRenewal\s+BillingRenewal\?\s+@relation/u);
});

test("CHIP checkout owns promotion reservation and signed activation", () => {
  const source = readFileSync(
    new URL("../src/modules/billing/chip-billing.service.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /reservePromotionForCheckout/u);
  assert.match(source, /activatePromotionAfterConfirmation/u);
  assert.match(source, /convertPromotionAfterPaidRenewal/u);
  assert.match(source, /cancelPromotionReservation/u);
  assert.match(source, /purchase\.preauthorized/u);
  assert.match(source, /status: preauthorized \? "PENDING" : "PAID"/u);
  assert.match(source, /promo:\$\{activatedPromotion\.id\}:conversion/u);
  assert.match(source, /conversionBillingRenewalId:conversionRenewal\.id/u);
  assert.match(source, /SIGNED_WEBHOOK_REQUIRED/u);
});
