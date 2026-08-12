import assert from "node:assert/strict";
import test from "node:test";

import {
  assertBillingProviderCallAllowed,
} from "../src/modules/billing/billing-provider.policy.js";


test(
  "disabled billing blocks every provider call",
  () => {
    for(const provider of ["hitpay", "chip"] as const){
      assert.throws(
        () => assertBillingProviderCallAllowed(
          "disabled",
          provider,
        ),
        (error:any) =>
          error?.code === "BILLING_CHECKOUT_DISABLED"
          && error?.statusCode === 503,
      );
    }
  },
);


test(
  "CHIP mode blocks legacy HitPay calls",
  () => {
    assert.throws(
      () => assertBillingProviderCallAllowed(
        "chip",
        "hitpay",
      ),
      (error:any) =>
        error?.code === "BILLING_PROVIDER_INACTIVE"
        && error?.statusCode === 503,
    );

    assert.doesNotThrow(
      () => assertBillingProviderCallAllowed(
        "chip",
        "chip",
      ),
    );
  },
);


test(
  "HitPay mode allows only HitPay during rollback",
  () => {
    assert.doesNotThrow(
      () => assertBillingProviderCallAllowed(
        "hitpay",
        "hitpay",
      ),
    );

    assert.throws(
      () => assertBillingProviderCallAllowed(
        "hitpay",
        "chip",
      ),
      (error:any) =>
        error?.code === "BILLING_PROVIDER_INACTIVE",
    );
  },
);
