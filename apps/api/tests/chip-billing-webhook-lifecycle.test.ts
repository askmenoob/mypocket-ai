import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";

const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicKey = keys.publicKey.export({ type:"spki", format:"pem" }).toString();

process.env.CHIP_ENVIRONMENT = "test";
process.env.CHIP_WEBHOOK_PUBLIC_KEY = publicKey;

const { ChipBillingService } = await import(
  "../src/modules/billing/chip-billing.service.js"
);

const checkoutId = "11111111-1111-4111-8111-111111111111";

function makeHarness(){
  const writes:Array<{ target:string; data:Record<string, unknown> }> = [];
  const lookups:Array<Record<string, unknown>> = [];
  const seenEvents = new Set<string>();
  const subscription = {
    id:"billing-1",
    workspaceId:"workspace-1",
    ownerUserId:"owner-1",
    plan:"FAMILY",
    paidThroughAt:new Date("2026-08-31T00:00:00.000Z"),
    accessState:"SUSPENDED",
  };
  const attempt = {
    id:"attempt-1",
    workspaceBillingSubscriptionId:subscription.id,
    provider:"CHIP",
    providerCheckoutId:checkoutId,
    amountDue:19,
    reference:"imai-workspace-family",
    plan:"FAMILY",
    billingInterval:"MONTHLY",
    renewalMethod:"AUTOMATIC",
    attemptType:"RENEWAL",
    coverageStart:new Date("2026-09-01T00:00:00.000Z"),
    coverageEnd:new Date("2026-10-01T00:00:00.000Z"),
    workspaceBillingSubscription:subscription,
  };
  const record = (target:string, input:any) => {
    writes.push({ target, data:input.data });
    return { id:`${target}-id`, ...input.data };
  };
  const tx:any = {
    billingPaymentAttempt:{
      findUnique:async (input:any) => {
        lookups.push(input.where.provider_providerCheckoutId);
        return input.where.provider_providerCheckoutId.providerCheckoutId === checkoutId
          ? attempt
          : null;
      },
      update:async (input:any) => record("attempt", input),
    },
    billingWebhookEvent:{
      create:async (input:any) => {
        if(seenEvents.has(input.data.eventKey)){
          throw Object.assign(new Error("duplicate"), { code:"P2002" });
        }
        seenEvents.add(input.data.eventKey);
        writes.push({ target:"event.create", data:input.data });
        return { id:"event-1" };
      },
      update:async (input:any) => record("event.update", input),
    },
    workspaceBillingSubscription:{ update:async (input:any) => record("billing", input) },
    subscription:{
      upsert:async (input:any) => record("subscription", { data:input.update }),
      updateMany:async (input:any) => record("subscription.updateMany", input),
    },
    workspace:{ update:async (input:any) => record("workspace", input) },
    billingRenewal:{ upsert:async (input:any) => record("renewal", { data:input.update }) },
    billingRecurringToken:{ upsert:async (input:any) => record("token", { data:input.create }) },
    billingReminderDelivery:{ upsert:async (input:any) => record("reminder", { data:input.create }) },
  };
  const app:any = {
    prisma:{
      $transaction:async (callback:(client:typeof tx) => unknown) => callback(tx),
    },
  };
  return { service:new ChipBillingService(app), writes, lookups };
}

function delivery(payload:Record<string, unknown>){
  const rawBody = Buffer.from(JSON.stringify(payload));
  return {
    rawBody,
    signature:sign("RSA-SHA256", rawBody, keys.privateKey).toString("base64"),
  };
}

test("signed paid webhook stores the purchase id when CHIP marks it as the recurring token", async () => {
  const fixture = makeHarness();
  const paid = delivery({
    event_type:"purchase.paid",
    id:checkoutId,
    status:"paid",
    is_test:true,
    updated_on:1788211200,
    force_recurring:true,
    is_recurring_token:true,
    recurring_token:null,
    payment:{ amount:1900, currency:"MYR", paid_on:1788211200 },
    purchase:{ total:1900, currency:"MYR" },
    transaction_data:{ payment_method:"visa" },
  });

  const first = await fixture.service.receiveWebhook(paid);
  const replay = await fixture.service.receiveWebhook(paid);

  assert.equal(first.activated, true);
  assert.equal(replay.duplicate, true);
  assert.equal(fixture.writes.find((item) => item.target === "billing")?.data.accessState, "ACTIVE");
  assert.equal(fixture.writes.find((item) => item.target === "token")?.data.providerTokenId, checkoutId);
  assert.equal(fixture.writes.find((item) => item.target === "reminder")?.data.reminderType, "ACCESS_REACTIVATED");
});

test("signed refund suspends writes without deleting subscription data", async () => {
  const fixture = makeHarness();
  const refunded = delivery({
    event_type:"payment.refunded",
    id:"33333333-3333-4333-8333-333333333333",
    is_test:true,
    updated_on:1788211300,
    related_to:{ type:"purchase", id:checkoutId },
    payment:{ amount:1900, currency:"MYR" },
  });

  const result = await fixture.service.receiveWebhook(refunded);

  assert.equal(result.refunded, true);
  assert.equal(fixture.writes.find((item) => item.target === "attempt")?.data.status, "REFUNDED");
  assert.equal(fixture.writes.find((item) => item.target === "billing")?.data.accessState, "SUSPENDED");
  assert.equal(fixture.writes.find((item) => item.target === "subscription.updateMany")?.data.status, "INACTIVE");
  assert.deepEqual(fixture.lookups[0], {
    provider:"CHIP",
    providerCheckoutId:checkoutId,
  });
});

test("signed chargeback uses the related purchase and suspends access", async () => {
  const fixture = makeHarness();
  const chargeback = delivery({
    event_type:"payment.charged_back",
    id:"44444444-4444-4444-8444-444444444444",
    is_test:true,
    updated_on:1788211400,
    related_to:{ type:"purchase", id:checkoutId },
    payment:{ amount:1900, currency:"MYR" },
  });

  const result = await fixture.service.receiveWebhook(chargeback);

  assert.equal(result.refunded, true);
  assert.equal(fixture.writes.find((item) => item.target === "billing")?.data.accessState, "SUSPENDED");
  assert.deepEqual(fixture.lookups[0], {
    provider:"CHIP",
    providerCheckoutId:checkoutId,
  });
});

test("signed recurring charge failure marks the payment attempt failed", async () => {
  const fixture = makeHarness();
  const failure = delivery({
    event_type:"purchase.subscription_charge_failure",
    id:checkoutId,
    status:"pending",
    is_test:true,
    updated_on:1788211500,
  });

  const result = await fixture.service.receiveWebhook(failure);

  assert.equal(result.activated, false);
  assert.equal(fixture.writes.find((item) => item.target === "attempt")?.data.status, "FAILED");
  assert.equal(fixture.writes.find((item) => item.target === "billing")?.data.lastPaymentStatus, "FAILED");
});
