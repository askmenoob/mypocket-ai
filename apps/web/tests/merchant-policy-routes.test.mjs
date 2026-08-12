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
    "support@imai.my",
    "+60 10-325 0032",
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
});
