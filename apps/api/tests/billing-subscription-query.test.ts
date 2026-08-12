import assert from "node:assert/strict";
import test from "node:test";

import { BillingSubscriptionService } from "../src/modules/billing/billing-subscription.service.js";

test("subscription read remains provider-neutral after HitPay retirement", async () => {
  const app = {
    prisma:{
      workspaceMember:{
        findUnique:async () => ({
          role:"OWNER",
          user:{ subscription:{ plan:"FAMILY", status:"ACTIVE", expiresAt:null } },
          workspace:{
            id:"workspace-1",
            name:"Family",
            type:"FAMILY",
            billingSubscription:{
              id:"billing-1",
              plan:"FAMILY",
              pendingPlan:null,
              planChangeRequestedAt:null,
              status:"ACTIVE",
              provider:"CHIP",
              checkoutUrl:null,
              currentPeriodStart:null,
              currentPeriodEnd:null,
              lastPaymentAt:null,
              lastPaymentStatus:"SUCCEEDED",
              canceledAt:null,
              billingInterval:"MONTHLY",
              renewalMethod:"AUTOMATIC",
              accessState:"ACTIVE",
              paidThroughAt:null,
              nextRenewalAt:null,
              paymentDueAt:null,
              graceEndsAt:null,
              autoRenewEnabled:true,
              cancelAtPeriodEnd:false,
            },
          },
        }),
      },
      billingRenewal:{ findMany:async () => [] },
    },
  };

  const result = await new BillingSubscriptionService(app as any).getSubscription({
    userId:"user-1",
    workspaceId:"workspace-1",
  });

  assert.equal(result.access.plan, "FAMILY");
  assert.equal(result.billing?.provider, "CHIP");
  assert.equal(result.billing?.accessState, "ACTIVE");
  assert.deepEqual(result.renewalHistory, []);
});

test("subscription read rejects users outside the workspace", async () => {
  const app = {
    prisma:{
      workspaceMember:{ findUnique:async () => null },
    },
  };

  await assert.rejects(
    new BillingSubscriptionService(app as any).getSubscription({
      userId:"outsider",
      workspaceId:"workspace-1",
    }),
    (error:any) => error?.code === "BILLING_MEMBERSHIP_NOT_FOUND"
      && error?.statusCode === 404,
  );
});
