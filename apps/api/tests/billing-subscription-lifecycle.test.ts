import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import test from "node:test";

import {
  BillingService,
} from "../src/modules/billing/billing.service.js";


type BillingStatus =
  | "CANCELED"
  | "PAUSED";


function createService(
  input:{
    accessPlan:string;
    billingPlan:string;
    billingStatus:BillingStatus;
  },
){

  let hitPayCalls = 0;
  let upsertCalls = 0;

  const existingBilling = {
    id:"billing-1",
    workspaceId:"workspace-1",
    ownerUserId:"user-1",
    plan:input.billingPlan,
    status:input.billingStatus,
    provider:"HITPAY",
    providerPlanId:"provider-plan-old",
    providerSubscriptionId:"provider-subscription-old",
    checkoutReference:"reference-old",
    checkoutUrl:"https://sandbox.hit-pay.com/old",
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

  const app = {
    log:{
      error:() => undefined,
    },
    prisma:{
      workspaceMember:{
        findUnique:async () => ({
          userId:"user-1",
          workspaceId:"workspace-1",
          role:"OWNER",
          user:{
            email:"owner@example.com",
            name:"Owner",
            subscription:{
              plan:input.accessPlan,
              status:"ACTIVE",
              expiresAt:null,
            },
          },
          workspace:{
            id:"workspace-1",
            ownerId:"user-1",
            name:"Workspace",
            type:"FAMILY",
            billingSubscription:existingBilling,
          },
        }),
        findFirst:async () => null,
      },
      workspaceBillingSubscription:{
        upsert:async () => {
          upsertCalls += 1;
          return existingBilling;
        },
      },
    },
  };

  const service =
    new BillingService(
      app as any,
    ) as any;

  service.hitPay = {
    request:async () => {
      hitPayCalls += 1;
      return {
        status:201,
        payload:{
          id:"provider-subscription-new",
          url:"https://sandbox.hit-pay.com/new",
        },
      };
    },
  };

  return {
    service,
    hitPayCalls:() => hitPayCalls,
    upsertCalls:() => upsertCalls,
  };

}


test(
  "an active package cannot be purchased again through a terminal billing row",
  async () => {

    const harness =
      createService({
        accessPlan:"FAMILY",
        billingPlan:"BUSINESS",
        billingStatus:"CANCELED",
      });

    await assert.rejects(
      harness.service.createCheckout({
        userId:"user-1",
        workspaceId:"workspace-1",
        checkout:{
          plan:"FAMILY",
        },
      }),
      (error:any) =>
        error?.code
        ===
        "BILLING_ACCESS_ALREADY_ACTIVE",
    );

    assert.equal(
      harness.hitPayCalls(),
      0,
    );
    assert.equal(
      harness.upsertCalls(),
      0,
    );

  },
);


test(
  "a paused provider subscription blocks a second checkout",
  async () => {

    const harness =
      createService({
        accessPlan:"FREE",
        billingPlan:"FAMILY",
        billingStatus:"PAUSED",
      });

    await assert.rejects(
      harness.service.createCheckout({
        userId:"user-1",
        workspaceId:"workspace-1",
        checkout:{
          plan:"BUSINESS",
        },
      }),
      (error:any) =>
        error?.code
        ===
        "BILLING_CHECKOUT_EXISTS",
    );

    assert.equal(
      harness.hitPayCalls(),
      0,
    );
    assert.equal(
      harness.upsertCalls(),
      0,
    );

  },
);


test(
  "the web checkout guard permits only terminal billing states to start again",
  () => {

    const source =
      readFileSync(
        resolve(
          process.cwd(),
          "../web/src/app-bootstrap.tsx",
        ),
        "utf8",
      );

    const message =
      "This subscription is still being processed. Please refresh before choosing another plan.";
    const messageIndex =
      source.indexOf(
        message,
      );

    assert.notEqual(
      messageIndex,
      -1,
    );

    const guard =
      source.slice(
        Math.max(
          0,
          messageIndex - 420,
        ),
        messageIndex,
      );

    assert.match(
      guard,
      /!\[\s*"CANCELED",\s*"INACTIVE",\s*"EXPIRED",\s*\]\.includes\(\s*billing\.status,\s*\)/s,
    );

  },
);
