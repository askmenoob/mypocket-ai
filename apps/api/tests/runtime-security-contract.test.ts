import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import test from "node:test";

const envSource =
  readFileSync(
    resolve("src/config/env.ts"),
    "utf8",
  );
const tokenSource =
  readFileSync(
    resolve("src/shared/auth/token.service.ts"),
    "utf8",
  );
const transactionControllerSource =
  readFileSync(
    resolve("src/modules/transaction/transaction.controller.ts"),
    "utf8",
  );

test(
  "legacy HitPay credentials are required only when HitPay is active",
  () => {
    assert.match(
      envSource,
      /BILLING_CHECKOUT_PROVIDER === "hitpay"/,
    );
    assert.match(
      envSource,
      /HITPAY_API_KEY_REQUIRED_FOR_HITPAY|\$\{name\}_REQUIRED_FOR_HITPAY/,
    );
    assert.doesNotMatch(
      envSource,
      /HITPAY_API_KEY:\s*z\.string\(\)\s*\.min\(/,
    );
  },
);

test(
  "inactive provider fields may remain blank without breaking startup",
  () => {
    assert.match(
      envSource,
      /const emptyStringToUndefined/,
    );
    for(const field of [
      "CHIP_API_KEY",
      "CHIP_BRAND_ID",
      "CHIP_WEBHOOK_PUBLIC_KEY",
      "CHIP_WEBHOOK_URL",
      "CHIP_RETURN_URL",
      "HITPAY_WEBHOOK_SALT",
    ]){
      assert.match(
        envSource,
        new RegExp(
          `${field}:[\\s\\S]{0,120}emptyStringToUndefined`,
        ),
      );
    }
  },
);

test(
  "new dashboard JWTs expire according to the runtime policy",
  () => {
    assert.match(
      envSource,
      /JWT_EXPIRES_IN:[\s\S]*?\.default\("12h"\)/,
    );
    assert.match(
      envSource,
      /JWT_EXPIRES_IN:[\s\S]*?\^\\d\+\[smhd\]\$/,
    );
    assert.match(
      tokenSource,
      /expiresIn:[\s\S]*?env\.JWT_EXPIRES_IN/,
    );
  },
);

test(
  "transaction routes do not print authenticated JWT contents",
  () => {
    assert.doesNotMatch(
      transactionControllerSource,
      /TRANSACTION JWT USER|JSON\.stringify\(user/,
    );
  },
);
