import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("merchant policy routes render dedicated public pages", async () => {
  const [main, server] = await Promise.all([
    source("src/main.tsx"),
    source("server.mjs"),
  ]);

  assert.match(main, /renderMerchantPolicyPage/);
  assert.match(main, /"\/refund-policy"/);
  assert.match(main, /"\/shipping-policy"/);
  assert.match(server, /"\/refund-policy"/);
  assert.match(server, /"\/shipping-policy"/);
});

test("policies disclose operator, digital delivery, refunds, and support", async () => {
  const policy = await source("src/merchant-policy-page.ts");

  for (const required of [
    "RIFTECH ENTERPRISE",
    "201803398437 (002913082-T)",
    "support@imai.my",
    "Digital Delivery Policy",
    "no physical goods",
    "original payment method",
    "7 calendar days",
    "refund-policy",
    "shipping-policy",
  ]) {
    assert.ok(policy.includes(required), `missing merchant disclosure: ${required}`);
  }

  assert.doesNotMatch(policy, /admin@imai\.my/);
  assert.doesNotMatch(policy, /TANJUNG API-API|SEKSYEN 30|SHAH ALAM|Sole proprietorship|Registration status|Telephone|\+60 10-325 0032/);
});

test("public landing exposes payment-review policy links and subscription prices", async () => {
  const landing = await source("src/public-landing.tsx");

  assert.match(landing, /href="\/refund-policy"/);
  assert.match(landing, /href="\/shipping-policy"/);
  assert.match(landing, /RIFTECH ENTERPRISE/);
  assert.match(landing, /support@imai\.my/);
  assert.match(landing, /price="RM9"/);
  assert.match(landing, /price="RM19"/);
  assert.match(landing, /price="RM49"/);
});

test("privacy and terms use the submitted CHIP support identity", async () => {
  const [privacy, terms] = await Promise.all([
    source("src/privacy-page.ts"),
    source("src/terms-page.ts"),
  ]);

  for (const page of [privacy, terms]) {
    assert.match(page, /RIFTECH ENTERPRISE/);
    assert.match(page, /support@imai\.my/);
    assert.doesNotMatch(page, /admin@imai\.my/);
  }

  assert.match(terms, /201803398437 \(002913082-T\)/);

  for (const page of [privacy, terms]) {
    assert.doesNotMatch(page, /TANJUNG API-API|SEKSYEN 30|SHAH ALAM|sole proprietorship|\+60 10-325 0032/);
  }
});

test("public landing does not publish private merchant details", async () => {
  const landing = await source("src/public-landing.tsx");

  assert.doesNotMatch(landing, /TANJUNG API-API|SEKSYEN 30|SHAH ALAM|\+60 10-325 0032/);
});
