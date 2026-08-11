import assert from "node:assert/strict";
import {
  createHmac,
} from "node:crypto";
import test from "node:test";

import {
  env,
} from "../src/config/index.js";
import {
  BillingService,
} from "../src/modules/billing/billing.service.js";


type RecordedWrite = {
  target:string;
  data:Record<string, unknown>;
};


function lifecycleHarness(){
  const writes:RecordedWrite[] = [];
  const folderRenames:Array<{
    workspaceId:string;
    plan:string;
  }> = [];
  let existingWebhookEvent:
    Record<string, any>
    |
    null =
      null;
  const billing = {
    id:"billing-family",
    workspaceId:"workspace-family",
    ownerUserId:"owner-family",
    plan:"FAMILY",
    status:"PENDING",
    provider:"HITPAY",
    providerPlanId:
      env.HITPAY_PLAN_FAMILY_ID,
    providerSubscriptionId:
      "provider-subscription-family",
    checkoutReference:
      "checkout-family",
    checkoutUrl:
      "https://sandbox.hit-pay.com/family",
    pendingPlan:null,
    pendingProviderPlanId:null,
    planChangeRequestedAt:null,
    currentPeriodStart:null,
    currentPeriodEnd:null,
    lastPaymentAt:null,
    lastPaymentStatus:null,
    canceledAt:null,
    lastWebhookAt:null,
  };

  const record =
    (
      target:string,
      input:{
        data:Record<string, unknown>;
      },
    ) => {
      writes.push({
        target,
        data:input.data,
      });
      return {
        ...billing,
        ...input.data,
      };
    };

  const transaction = {
    workspaceBillingSubscription:{
      update:async (input:any) =>
        record(
          "workspaceBillingSubscription.update",
          input,
        ),
    },
    subscription:{
      upsert:async (input:any) => {
        writes.push({
          target:"subscription.upsert",
          data:input.update,
        });
        return input.update;
      },
      updateMany:async (input:any) =>
        record(
          "subscription.updateMany",
          input,
        ),
    },
    workspace:{
      update:async (input:any) =>
        record(
          "workspace.update",
          input,
        ),
    },
    billingWebhookEvent:{
      update:async (input:any) =>
        record(
          "billingWebhookEvent.transactionUpdate",
          input,
        ),
    },
  };

  const app = {
    log:{
      warn:() => undefined,
      error:() => undefined,
    },
    prisma:{
      billingWebhookEvent:{
        findUnique:async (input:any) =>
          input.where.eventKey
            === existingWebhookEvent
              ?.eventKey
                ? existingWebhookEvent
                : null,
        findFirst:async (input:any) =>
          input.where.externalId
            === existingWebhookEvent
              ?.externalId
                ? existingWebhookEvent
                : null,
        create:async () => ({
          id:"webhook-event-new",
        }),
        update:async (input:any) => {
          const target =
            input.data.status
              === "RECEIVED_MAPPED"
                ? "billingWebhookEvent.recoveryUpdate"
                : "billingWebhookEvent.errorUpdate";

          writes.push({
            target,
            data:input.data,
          });

          existingWebhookEvent = {
            ...existingWebhookEvent,
            id:
              existingWebhookEvent?.id
              ??
              input.where.id,
            ...input.data,
          };

          return existingWebhookEvent;
        },
      },
      workspaceBillingSubscription:{
        findUnique:async (input:any) =>
          input.where.providerSubscriptionId
            === billing.providerSubscriptionId
              ? billing
              : null,
        findMany:async () => [],
      },
      user:{
        findUnique:async () => null,
      },
      $transaction:async (callback:any) =>
        callback(transaction),
    },
  };

  const service =
    new BillingService(
      app as any,
      {
        renameAutoCreatedRootFolder:
          async (input) => {
            folderRenames.push(
              input,
            );
          },
      },
    );

  const deliver =
    async (
      eventObject:string,
      eventType:string,
      payload:Record<string, unknown>,
    ) => {
      const rawBody =
        Buffer.from(
          JSON.stringify(payload),
        );
      const signature =
        createHmac(
          "sha256",
          env.HITPAY_WEBHOOK_SALT
            ?? env.HITPAY_SALT,
        )
          .update(rawBody)
          .digest("hex");

      return service.recordWebhook({
        rawBody,
        signature,
        eventObject,
        eventType,
        payload,
      });
    };

  return {
    billing,
    deliver,
    folderRenames,
    setExistingWebhookEvent:
      (
        event:Record<string, any>,
      ) => {
        existingWebhookEvent =
          event;
      },
    writes,
  };
}


function writeFor(
  writes:RecordedWrite[],
  target:string,
){
  return writes.find(
    (write) =>
      write.target === target,
  );
}


test(
  "a successful exact-MYR charge activates billing and workspace access",
  async () => {
    const harness =
      lifecycleHarness();

    const result =
      await harness.deliver(
        "charge",
        "created",
        {
          id:"charge-family-success",
          recurring_billing_id:
            harness.billing.providerSubscriptionId,
          status:"succeeded",
          amount:19,
          currency:"MYR",
          created_at:
            "2026-08-11T00:00:00.000Z",
        },
      );

    assert.equal(
      result.activationPerformed,
      true,
    );
    assert.deepEqual(
      writeFor(
        harness.writes,
        "workspaceBillingSubscription.update",
      )?.data.status,
      "ACTIVE",
    );
    assert.deepEqual(
      writeFor(
        harness.writes,
        "subscription.upsert",
      )?.data,
      {
        plan:"FAMILY",
        status:"ACTIVE",
        expiresAt:
          new Date(
            "2026-09-11T00:00:00.000Z",
          ),
      },
    );
    assert.equal(
      writeFor(
        harness.writes,
        "workspace.update",
      )?.data.type,
      "FAMILY",
    );
    assert.equal(
      writeFor(
        harness.writes,
        "billingWebhookEvent.transactionUpdate",
      )?.data.status,
      "PROCESSED_ACTIVATED",
    );
  },
);


test(
  "a failed recurring charge enters retrying without activating access",
  async () => {
    const harness =
      lifecycleHarness();

    const result =
      await harness.deliver(
        "charge",
        "failed",
        {
          id:"charge-family-failed",
          recurring_billing_id:
            harness.billing.providerSubscriptionId,
          status:"failed",
          amount:19,
          currency:"MYR",
        },
      );

    assert.equal(
      result.activationPerformed,
      false,
    );
    assert.equal(
      writeFor(
        harness.writes,
        "workspaceBillingSubscription.update",
      )?.data.status,
      "RETRYING",
    );
    assert.equal(
      writeFor(
        harness.writes,
        "workspaceBillingSubscription.update",
      )?.data.lastPaymentStatus,
      "FAILED",
    );
    assert.equal(
      writeFor(
        harness.writes,
        "subscription.upsert",
      ),
      undefined,
    );
  },
);


test(
  "an immediate RM10 upgrade charge activates Family without resetting the paid period",
  async () => {
    const harness =
      lifecycleHarness();

    harness.billing.plan =
      "PERSONAL_PRO";
    harness.billing.status =
      "PLAN_CHANGE_PAYMENT_PENDING";
    harness.billing.providerPlanId =
      env.HITPAY_PLAN_PERSONAL_PRO_ID;
    harness.billing.pendingPlan =
      "FAMILY";
    harness.billing.pendingProviderPlanId =
      env.HITPAY_PLAN_FAMILY_ID;
    harness.billing.currentPeriodStart =
      new Date(
        "2026-08-10T18:45:40.000Z",
      );
    harness.billing.currentPeriodEnd =
      new Date(
        "2026-09-10T18:45:40.000Z",
      );

    const result =
      await harness.deliver(
        "charge",
        "created",
        {
          id:"charge-family-upgrade",
          recurring_billing_id:
            harness.billing
              .providerSubscriptionId,
          status:"succeeded",
          amount:10,
          currency:"MYR",
          created_at:
            "2026-08-11T05:00:00.000Z",
        },
      );

    assert.equal(
      result.activationPerformed,
      true,
    );
    assert.equal(
      writeFor(
        harness.writes,
        "workspaceBillingSubscription.update",
      )?.data.plan,
      "FAMILY",
    );
    assert.equal(
      writeFor(
        harness.writes,
        "workspaceBillingSubscription.update",
      )?.data.pendingPlan,
      null,
    );
    assert.equal(
      writeFor(
        harness.writes,
        "workspaceBillingSubscription.update",
      )?.data.currentPeriodStart,
      harness.billing.currentPeriodStart,
    );
    assert.equal(
      writeFor(
        harness.writes,
        "workspaceBillingSubscription.update",
      )?.data.currentPeriodEnd,
      harness.billing.currentPeriodEnd,
    );
    assert.equal(
      writeFor(
        harness.writes,
        "subscription.upsert",
      )?.data.plan,
      "FAMILY",
    );
    assert.equal(
      writeFor(
        harness.writes,
        "subscription.upsert",
      )?.data.expiresAt,
      harness.billing.currentPeriodEnd,
    );
    assert.equal(
      writeFor(
        harness.writes,
        "workspace.update",
      )?.data.type,
      "FAMILY",
    );
    assert.deepEqual(
      harness.folderRenames,
      [
        {
          workspaceId:
            harness.billing.workspaceId,
          plan:
            "FAMILY",
        },
      ],
    );
  },
);


test(
  "a nested HitPay recurring charge recovers its existing unmapped event without a second charge",
  async () => {
    const harness =
      lifecycleHarness();

    harness.billing.plan =
      "PERSONAL_PRO";
    harness.billing.status =
      "PLAN_CHANGE_PAYMENT_PENDING";
    harness.billing.providerPlanId =
      env.HITPAY_PLAN_PERSONAL_PRO_ID;
    harness.billing.pendingPlan =
      "FAMILY";
    harness.billing.pendingProviderPlanId =
      env.HITPAY_PLAN_FAMILY_ID;
    harness.billing.currentPeriodStart =
      new Date(
        "2026-08-10T18:45:40.000Z",
      );
    harness.billing.currentPeriodEnd =
      new Date(
        "2026-09-10T18:45:40.000Z",
      );

    harness.setExistingWebhookEvent({
      id:"webhook-event-unmapped",
      eventKey:
        "original-raw-body-event-key",
      externalId:
        "charge-family-upgrade-nested",
      eventObject:
        "charge",
      eventType:
        "created",
      workspaceBillingSubscriptionId:
        null,
      status:"RECEIVED_UNMAPPED",
    });

    const result =
      await harness.deliver(
        "charge",
        "created",
        {
          id:"charge-family-upgrade-nested",
          status:"succeeded",
          amount:10,
          currency:"myr",
          created_at:
            "2026-08-11T05:13:57.000Z",
          customer:{
            email:
              "owner@example.com",
          },
          relatable:{
            type:
              "business_charge",
            business_charge:{
              id:
                harness.billing
                  .providerSubscriptionId,
              reference:
                harness.billing
                  .checkoutReference,
              customer_email:
                "owner@example.com",
            },
          },
        },
      );

    assert.equal(
      result.duplicate,
      true,
    );
    assert.equal(
      result.activationPerformed,
      true,
    );
    assert.deepEqual(
      writeFor(
        harness.writes,
        "billingWebhookEvent.recoveryUpdate",
      )?.data,
      {
        workspaceBillingSubscriptionId:
          harness.billing.id,
        status:
          "RECEIVED_MAPPED",
        errorMessage:
          null,
      },
    );
    assert.equal(
      writeFor(
        harness.writes,
        "workspaceBillingSubscription.update",
      )?.data.plan,
      "FAMILY",
    );
    assert.equal(
      writeFor(
        harness.writes,
        "subscription.upsert",
      )?.data.plan,
      "FAMILY",
    );
  },
);


test(
  "an inactive provider subscription deactivates MyPocket access",
  async () => {
    const harness =
      lifecycleHarness();

    await harness.deliver(
      "recurring_billing",
      "subscription_updated",
      {
        id:
          harness.billing.providerSubscriptionId,
        status:"inactive",
      },
    );

    assert.equal(
      writeFor(
        harness.writes,
        "workspaceBillingSubscription.update",
      )?.data.status,
      "INACTIVE",
    );
    assert.equal(
      writeFor(
        harness.writes,
        "subscription.updateMany",
      )?.data.status,
      "INACTIVE",
    );
  },
);


test(
  "a successful charge with the wrong amount fails closed",
  async () => {
    const harness =
      lifecycleHarness();

    await assert.rejects(
      harness.deliver(
        "charge",
        "created",
        {
          id:"charge-family-mismatch",
          recurring_billing_id:
            harness.billing.providerSubscriptionId,
          status:"succeeded",
          amount:18,
          currency:"MYR",
        },
      ),
      (error:any) =>
        error?.code
        === "HITPAY_PAYMENT_MISMATCH",
    );

    assert.equal(
      writeFor(
        harness.writes,
        "subscription.upsert",
      ),
      undefined,
    );
    assert.equal(
      writeFor(
        harness.writes,
        "billingWebhookEvent.errorUpdate",
      )?.data.status,
      "ERROR",
    );
  },
);
