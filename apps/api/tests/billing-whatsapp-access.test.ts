import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateWhatsAppBillingAccess,
  isBillingPaymentCommand,
} from "../src/modules/billing/billing-access.policy.js";

test("suspended billing blocks receipt, voice and transaction writes", () => {
  assert.equal(
    evaluateWhatsAppBillingAccess({ accessState: "SUSPENDED", isMedia: true })
      .allowed,
    false,
  );
  assert.equal(
    evaluateWhatsAppBillingAccess({
      accessState: "SUSPENDED",
      text: "add petrol rm50",
      isMedia: false,
    }).allowed,
    false,
  );
});

test("suspended billing still allows pay, status, help and cancel", () => {
  for (const text of ["!pay", "status", "help", "cancel", "bayar langganan"]) {
    assert.equal(
      evaluateWhatsAppBillingAccess({
        accessState: "SUSPENDED",
        text,
        isMedia: false,
      }).allowed,
      true,
      text,
    );
  }
  assert.equal(isBillingPaymentCommand("bayar nasi rm5"), false);
  assert.equal(isBillingPaymentCommand("!pay"), true);
});

test("grace and payment-due states warn but keep the bot operational", () => {
  assert.deepEqual(
    evaluateWhatsAppBillingAccess({
      accessState: "GRACE",
      text: "add lunch rm8",
      isMedia: false,
    }),
    { allowed: true, warning: "GRACE" },
  );
  assert.deepEqual(
    evaluateWhatsAppBillingAccess({
      accessState: "PAYMENT_DUE",
      isMedia: true,
    }),
    { allowed: true, warning: "PAYMENT_DUE" },
  );
});
