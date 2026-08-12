import assert from "node:assert/strict";
import test from "node:test";

import {
  assertBillingProviderCallAllowed,
} from "../src/modules/billing/billing-provider.policy.js";


test(
  "disabled billing blocks CHIP calls",
  () => {
    assert.throws(
      () => assertBillingProviderCallAllowed(
        "disabled",
        "chip",
      ),
      (error:any) =>
        error?.code === "BILLING_CHECKOUT_DISABLED"
        && error?.statusCode === 503,
    );
  },
);


test(
  "CHIP mode allows only the supported CHIP provider",
  () => {
    assert.doesNotThrow(
      () => assertBillingProviderCallAllowed(
        "chip",
        "chip",
      ),
    );
  },
);
