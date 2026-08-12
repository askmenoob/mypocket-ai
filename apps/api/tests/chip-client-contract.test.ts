import assert from "node:assert/strict";
import test from "node:test";
import { ChipClient } from "../src/modules/billing/chip.client.js";

const apiKey = "chip-test-secret-never-log-this-value";
const brandId = "11111111-1111-4111-8111-111111111111";
const purchaseId = "22222222-2222-4222-8222-222222222222";
const tokenId = "33333333-3333-4333-8333-333333333333";

test("CHIP client uses official trailing-slash endpoints and Bearer auth", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const client = new ChipClient(
    {
      apiBaseUrl: "https://gate.chip-in.asia/api/v1",
      apiKey,
    },
    (async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response(
        JSON.stringify({
          id: purchaseId,
          status: "created",
          is_test: true,
          checkout_url: "https://gate.chip-in.asia/p/test/",
          reference: "imai_test",
          force_recurring: false,
          is_recurring_token: false,
          recurring_token: null,
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch,
  );

  await client.createPurchase({
    client: { email: "buyer@example.com" },
    purchase: {
      currency: "MYR",
      products: [{ name: "Family 6 months", price: 11_400, quantity: 1 }],
      metadata: { workspaceId: "workspace-1" },
    },
    brand_id: brandId,
    reference: "imai_test",
    send_receipt: true,
    force_recurring: false,
    success_redirect: "https://app.imai.my/billing?result=success",
    failure_redirect: "https://app.imai.my/billing?result=failure",
    cancel_redirect: "https://app.imai.my/billing?result=cancel",
    success_callback: "https://api.imai.my/api/v1/billing/chip/webhook/test",
    creator_agent: "mypocket-ai",
    platform: "web",
  });

  assert.equal(calls[0]?.url, "https://gate.chip-in.asia/api/v1/purchases/");
  assert.equal(
    new Headers(calls[0]?.init.headers).get("authorization"),
    `Bearer ${apiKey}`,
  );
  assert.equal(JSON.stringify(calls).includes(apiKey), true);
});

test("CHIP client resolves configured methods and recurring charge contract", async () => {
  const urls: string[] = [];
  const bodies: string[] = [];
  const client = new ChipClient(
    { apiBaseUrl: "https://gate.chip-in.asia/api/v1", apiKey },
    (async (url, init) => {
      urls.push(String(url));
      bodies.push(String(init?.body ?? ""));
      if (String(url).includes("payment_methods")) {
        return new Response(
          JSON.stringify({
            available_payment_methods: ["fpx", "visa", "razer_tng", "duitnow_qr"],
            card_methods: ["visa"],
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          id: purchaseId,
          status: "pending_charge",
          is_test: true,
          checkout_url: null,
          reference: "imai_renewal",
          force_recurring: false,
          is_recurring_token: false,
          recurring_token: tokenId,
        }),
        { status: 200 },
      );
    }) as typeof fetch,
  );

  const methods = await client.listPaymentMethods({
    brandId,
    amountSen: 900,
    recurring: true,
  });
  await client.chargePurchase(purchaseId, tokenId);

  assert.deepEqual(methods.available_payment_methods, [
    "fpx",
    "visa",
    "razer_tng",
    "duitnow_qr",
  ]);
  assert.match(urls[0] ?? "", /currency=MYR/u);
  assert.match(urls[0] ?? "", /recurring=true/u);
  assert.equal(
    urls[1],
    `https://gate.chip-in.asia/api/v1/purchases/${purchaseId}/charge/`,
  );
  assert.deepEqual(JSON.parse(bodies[1] ?? "{}"), { recurring_token: tokenId });
});

test("CHIP client maps timeout without leaking credentials", async () => {
  const client = new ChipClient(
    { apiBaseUrl: "https://gate.chip-in.asia/api/v1", apiKey, timeoutMs: 1 },
    (async (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
        });
      })) as typeof fetch,
  );

  await assert.rejects(
    () => client.retrievePurchase(purchaseId),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, "CHIP_REQUEST_TIMEOUT");
      assert.equal(String(error).includes(apiKey), false);
      return true;
    },
  );
});
