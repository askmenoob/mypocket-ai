import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import test from "node:test";

import {
  env,
} from "../src/config/index.js";
import {
  BillingService,
} from "../src/modules/billing/billing.service.js";


function immediateUpgradeHarness(){
  const providerCalls:Array<Record<string, any>> = [];
  const databaseWrites:Array<Record<string, any>> = [];

  const billing:Record<string, any> = {
    id:"billing-personal-pro",
    workspaceId:"workspace-personal",
    ownerUserId:"owner-personal",
    plan:"PERSONAL_PRO",
    status:"ACTIVE",
    provider:"HITPAY",
    providerPlanId:
      env.HITPAY_PLAN_PERSONAL_PRO_ID,
    providerSubscriptionId:
      "provider-subscription-personal",
    checkoutReference:
      "checkout-personal",
    checkoutUrl:
      "https://sandbox.hit-pay.com/personal",
    pendingPlan:"FAMILY",
    pendingProviderPlanId:
      env.HITPAY_PLAN_FAMILY_ID,
    planChangeRequestedAt:
      new Date(
        "2026-08-11T04:45:01.097Z",
      ),
    currentPeriodStart:
      new Date(
        "2026-08-10T18:45:40.000Z",
      ),
    currentPeriodEnd:
      new Date(
        "2026-09-10T18:45:40.000Z",
      ),
    lastPaymentAt:
      new Date(
        "2026-08-10T18:45:40.000Z",
      ),
    lastPaymentStatus:"SUCCEEDED",
    canceledAt:null,
    lastWebhookAt:null,
    updatedAt:
      new Date(
        "2026-08-11T04:45:01.097Z",
      ),
  };

  const app = {
    log:{
      error:() => undefined,
      warn:() => undefined,
    },
    prisma:{
      workspaceMember:{
        findUnique:async () => ({
          userId:"owner-personal",
          workspaceId:"workspace-personal",
          role:"OWNER",
          user:{
            email:"owner@example.com",
            name:"Owner",
            subscription:{
              plan:"PERSONAL_PRO",
              status:"ACTIVE",
              expiresAt:
                billing.currentPeriodEnd,
            },
          },
          workspace:{
            id:"workspace-personal",
            ownerId:"owner-personal",
            name:"Personal workspace",
            type:"PERSONAL",
            billingSubscription:{
              ...billing,
            },
          },
        }),
        findFirst:async () => null,
      },
      workspaceBillingSubscription:{
        updateMany:async (input:any) => {
          databaseWrites.push({
            operation:"updateMany",
            ...input,
          });
          Object.assign(
            billing,
            input.data,
          );
          return {
            count:1,
          };
        },
        update:async (input:any) => {
          databaseWrites.push({
            operation:"update",
            ...input,
          });
          Object.assign(
            billing,
            input.data,
          );
          return {
            ...billing,
          };
        },
        findUnique:async () => ({
          ...billing,
        }),
      },
    },
  };

  const service =
    new BillingService(
      app as any,
    ) as any;

  service.hitPay = {
    request:async (input:any) => {
      providerCalls.push(input);

      if(
        input.path
          ===
        "/v1/charge/recurring-billing/provider-subscription-personal"
      ){
        return {
          status:201,
          payload:{
            payment_id:
              "payment-upgrade-family",
            recurring_billing_id:
              "provider-subscription-personal",
            amount:10,
            currency:"myr",
            status:"succeeded",
          },
        };
      }

      return {
        status:200,
        payload:{
          id:
            "provider-subscription-personal",
          business_recurring_plans_id:
            env.HITPAY_PLAN_FAMILY_ID,
          status:"active",
        },
      };
    },
  };

  return {
    billing,
    databaseWrites,
    providerCalls,
    service,
  };
}


test(
  "Personal Pro to Family charges only the RM10 balance now and awaits a signed webhook",
  async () => {
    const harness =
      immediateUpgradeHarness();

    const result =
      await harness.service.changePlan({
        userId:"owner-personal",
        workspaceId:"workspace-personal",
        change:{
          plan:"FAMILY",
        },
      });

    assert.deepEqual(
      result,
      {
        currentPlan:"PERSONAL_PRO",
        pendingPlan:"FAMILY",
        status:
          "PLAN_CHANGE_PAYMENT_PENDING",
        effective:
          "AFTER_PAYMENT",
        paymentStatus:
          "AWAITING_WEBHOOK",
        amountDueNow:10,
        currency:"MYR",
        reused:false,
      },
    );

    assert.equal(
      harness.databaseWrites[0]
        ?.data.status,
      "PLAN_CHANGE_PAYMENT_PENDING",
    );
    assert.equal(
      harness.databaseWrites[0]
        ?.data.lastPaymentStatus,
      "PENDING",
    );

    assert.deepEqual(
      harness.providerCalls.map(
        (call) => ({
          method:call.method,
          path:call.path,
          body:call.body,
          encoding:call.encoding,
        }),
      ),
      [
        {
          method:"POST",
          path:
            "/v1/charge/recurring-billing/provider-subscription-personal",
          body:{
            amount:10,
            currency:"MYR",
          },
          encoding:"form",
        },
      ],
    );

    assert.equal(
      harness.billing.plan,
      "PERSONAL_PRO",
    );
    assert.equal(
      harness.billing.pendingPlan,
      "FAMILY",
    );
  },
);


test(
  "a repeated upgrade request never creates a second charge",
  async () => {
    const harness =
      immediateUpgradeHarness();

    harness.billing.status =
      "PLAN_CHANGE_PAYMENT_PENDING";

    const result =
      await harness.service.changePlan({
        userId:"owner-personal",
        workspaceId:"workspace-personal",
        change:{
          plan:"FAMILY",
        },
      });

    assert.equal(
      result.reused,
      true,
    );
    assert.equal(
      result.paymentStatus,
      "AWAITING_WEBHOOK",
    );
    assert.equal(
      harness.providerCalls.length,
      0,
    );
    assert.equal(
      harness.billing.plan,
      "PERSONAL_PRO",
    );
  },
);


test(
  "a declined balance charge rolls the provider back and keeps Personal Pro active",
  async () => {
    const harness =
      immediateUpgradeHarness();

    harness.service.hitPay = {
      request:async (input:any) => {
        harness.providerCalls.push(input);

        if(input.method === "POST"){
          return {
            status:402,
            payload:{
              status:"failed",
            },
          };
        }

        return {
          status:200,
          payload:{
            id:
              "provider-subscription-personal",
            business_recurring_plans_id:
              env.HITPAY_PLAN_PERSONAL_PRO_ID,
            status:"active",
          },
        };
      },
    };

    await assert.rejects(
      () => harness.service.changePlan({
        userId:"owner-personal",
        workspaceId:"workspace-personal",
        change:{
          plan:"FAMILY",
        },
      }),
      {
        code:
          "HITPAY_PLAN_CHANGE_PAYMENT_FAILED",
        statusCode:
          402,
      },
    );

    assert.deepEqual(
      harness.providerCalls.map(
        (call) => ({
          method:call.method,
          path:call.path,
        }),
      ),
      [
        {
          method:"POST",
          path:
            "/v1/charge/recurring-billing/provider-subscription-personal",
        },
        {
          method:"PUT",
          path:
            "/v1/recurring-billing/provider-subscription-personal",
        },
      ],
    );
    assert.equal(
      harness.billing.plan,
      "PERSONAL_PRO",
    );
    assert.equal(
      harness.billing.pendingPlan,
      null,
    );
    assert.equal(
      harness.billing.status,
      "ACTIVE",
    );
    assert.equal(
      harness.billing.lastPaymentStatus,
      "FAILED",
    );
  },
);


test(
  "the UI presents an immediate paid upgrade instead of next-cycle activation",
  () => {
    const source =
      readFileSync(
        resolve(
          process.cwd(),
          "../web/src/app-bootstrap.tsx",
        ),
        "utf8",
      );
    const hitPayClient =
      readFileSync(
        resolve(
          process.cwd(),
          "src/modules/billing/hitpay.client.ts",
        ),
        "utf8",
      );

    assert.match(
      source,
      /Pay RM\$\{[^}]+\} & switch now/u,
    );
    assert.match(
      source,
      /Payment processing/u,
    );
    assert.match(
      source,
      /signed HitPay confirmation/u,
    );
    assert.doesNotMatch(
      source,
      /Switch next cycle/u,
    );
    assert.match(
      hitPayClient,
      /application\/x-www-form-urlencoded/u,
    );
  },
);
