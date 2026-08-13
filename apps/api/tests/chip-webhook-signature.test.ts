import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import {
  chipWebhookEventKey,
  parseChipWebhookPayload,
  verifyChipWebhookSignature,
} from "../src/modules/billing/chip-webhook.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();

test("CHIP webhook verifies the exact raw body with RSA-SHA256", () => {
  const rawBody = Buffer.from(
    JSON.stringify({
      event_type: "purchase.paid",
      id: "11111111-1111-4111-8111-111111111111",
      status: "paid",
      is_test: true,
      updated_on: 1_786_400_000,
    }),
  );
  const signature = sign("RSA-SHA256", rawBody, privateKey).toString("base64");

  assert.equal(
    verifyChipWebhookSignature({ rawBody, signature, publicKeyPem }),
    true,
  );
  assert.equal(
    verifyChipWebhookSignature({
      rawBody: Buffer.concat([rawBody, Buffer.from(" ")]),
      signature,
      publicKeyPem,
    }),
    false,
  );
});

test("CHIP webhook parser requires signed-event identity fields", () => {
  assert.throws(
    () => parseChipWebhookPayload(Buffer.from('{"status":"paid"}')),
    (error: unknown) =>
      (error as { code?: string }).code === "CHIP_WEBHOOK_FIELDS_INVALID",
  );
});

test("CHIP webhook parser normalizes the official payment.refunded payload", () => {
  const payload = parseChipWebhookPayload(
    Buffer.from(
      JSON.stringify({
        event_type: "payment.refunded",
        id: "33333333-3333-4333-8333-333333333333",
        is_test: true,
        updated_on: 1_788_211_300,
        related_to: {
          type: "purchase",
          id: "11111111-1111-4111-8111-111111111111",
        },
        payment: { amount: 1_900, currency: "MYR" },
      }),
    ),
  );

  assert.equal(payload.status, "refunded");
  assert.equal(
    payload.related_to?.id,
    "11111111-1111-4111-8111-111111111111",
  );
});

test("CHIP payment events require the related purchase identity", () => {
  assert.throws(
    () =>
      parseChipWebhookPayload(
        Buffer.from(
          JSON.stringify({
            event_type: "payment.refunded",
            id: "33333333-3333-4333-8333-333333333333",
            is_test: true,
          }),
        ),
      ),
    (error: unknown) =>
      (error as { code?: string }).code === "CHIP_WEBHOOK_FIELDS_INVALID",
  );
});

test("CHIP webhook event key is stable for duplicate delivery", () => {
  const rawBody = Buffer.from(
    '{"event_type":"purchase.paid","id":"purchase-1","status":"paid","is_test":true,"updated_on":1786400000}',
  );
  const payload = parseChipWebhookPayload(rawBody);
  assert.equal(chipWebhookEventKey(payload, rawBody), chipWebhookEventKey(payload, rawBody));
});
