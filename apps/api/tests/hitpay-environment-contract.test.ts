import assert from "node:assert/strict";
import {
  createHmac,
} from "node:crypto";
import test from "node:test";
import Fastify from "fastify";

import {
  activeHitPayWebhookPath,
  hitPayEnvironmentIssues,
  hitPayWebhookSourceAllowed,
  hitPayWebhookSourceIps,
} from "../src/config/hitpay-environment.js";
import {
  env,
} from "../src/config/index.js";
import billingModule from "../src/modules/billing/index.js";


const planIds = {
  personalProPlanId:
    "11111111-1111-4111-8111-111111111111",
  familyPlanId:
    "22222222-2222-4222-8222-222222222222",
  businessPlanId:
    "33333333-3333-4333-8333-333333333333",
};


function webhookSignature(
  rawBody:string,
){
  return createHmac(
    "sha256",
    env.HITPAY_WEBHOOK_SALT
      ?? env.HITPAY_SALT,
  )
    .update(rawBody)
    .digest("hex");
}


async function billingTestApp(
  prisma?:unknown,
){
  const app = Fastify();

  app.decorate(
    "authenticate",
    async () => undefined,
  );

  if(prisma){
    app.decorate(
      "prisma",
      prisma as never,
    );
  }

  await app.register(
    billingModule,
    {
      prefix:"/api/v1",
    },
  );
  await app.ready();

  return app;
}


test(
  "HitPay sandbox and production routes remain isolated",
  () => {
    assert.equal(
      activeHitPayWebhookPath("sandbox"),
      "/billing/hitpay/webhook/sandbox",
    );
    assert.equal(
      activeHitPayWebhookPath("production"),
      "/billing/hitpay/webhook/production",
    );
  },
);


test(
  "HitPay webhook source IP allowlists remain environment-specific",
  () => {
    assert.deepEqual(
      hitPayWebhookSourceIps(
        "sandbox",
      ),
      [
        "54.179.156.147",
      ],
    );
    assert.deepEqual(
      hitPayWebhookSourceIps(
        "production",
      ),
      [
        "3.1.13.32",
        "52.77.254.34",
      ],
    );
    assert.equal(
      hitPayWebhookSourceAllowed(
        "sandbox",
        "54.179.156.147",
      ),
      true,
    );
    assert.equal(
      hitPayWebhookSourceAllowed(
        "production",
        "54.179.156.147",
      ),
      false,
    );
    assert.equal(
      hitPayWebhookSourceAllowed(
        "production",
        "",
      ),
      false,
    );
  },
);


test(
  "valid HitPay environment configuration passes closed-world validation",
  () => {
    assert.deepEqual(
      hitPayEnvironmentIssues({
        environment:"production",
        apiBaseUrl:"https://api.hit-pay.com",
        webhookUrl:
          "https://api.imai.my/api/v1/billing/hitpay/webhook/production",
        ...planIds,
      }),
      [],
    );
  },
);


test(
  "mixed HitPay environment credentials and routes fail validation",
  () => {
    assert.deepEqual(
      hitPayEnvironmentIssues({
        environment:"production",
        apiBaseUrl:"https://api.sandbox.hit-pay.com/v1",
        webhookUrl:
          "http://api.imai.my/api/v1/billing/hitpay/webhook/sandbox",
        personalProPlanId:
          planIds.personalProPlanId,
        familyPlanId:
          planIds.personalProPlanId,
        businessPlanId:
          planIds.businessPlanId,
      }),
      [
        "HITPAY_API_BASE_URL_ENVIRONMENT_MISMATCH",
        "HITPAY_API_BASE_URL_PATH_INVALID",
        "HITPAY_WEBHOOK_URL_PROTOCOL_INVALID",
        "HITPAY_WEBHOOK_URL_ENVIRONMENT_MISMATCH",
        "HITPAY_PLAN_IDS_NOT_UNIQUE",
      ],
    );
  },
);


test(
  "billing registers only the active HitPay webhook environment route",
  async (context) => {
    const app =
      await billingTestApp();

    context.after(
      async () => app.close(),
    );

    const inactiveEnvironment =
      env.HITPAY_ENVIRONMENT === "sandbox"
        ? "production"
        : "sandbox";

    assert.equal(
      app.hasRoute({
        method:"POST",
        url:
          `/api/v1${activeHitPayWebhookPath(env.HITPAY_ENVIRONMENT)}`,
      }),
      true,
    );
    assert.equal(
      app.hasRoute({
        method:"POST",
        url:
          `/api/v1${activeHitPayWebhookPath(inactiveEnvironment)}`,
      }),
      false,
    );
  },
);


test(
  "webhook rejects a signature that does not match the exact raw body",
  async (context) => {
    const app =
      await billingTestApp();

    context.after(
      async () => app.close(),
    );

    const rawBody =
      '{"id":"charge-contract","status":"succeeded"}';
    const signature =
      webhookSignature(
        `${rawBody} `,
      );

    const response =
      await app.inject({
        method:"POST",
        url:
          `/api/v1${activeHitPayWebhookPath(env.HITPAY_ENVIRONMENT)}`,
        headers:{
          "content-type":
            "application/json",
          "cf-connecting-ip":
            hitPayWebhookSourceIps(
              env.HITPAY_ENVIRONMENT,
            )[0],
          "hitpay-signature":
            signature,
          "hitpay-event-object":
            "charge",
          "hitpay-event-type":
            "created",
        },
        payload:
          rawBody,
      });

    assert.equal(
      response.statusCode,
      401,
    );
  },
);


test(
  "webhook accepts a raw-body signature before requiring event headers",
  async (context) => {
    const app =
      await billingTestApp();

    context.after(
      async () => app.close(),
    );

    const rawBody =
      '{ "id": "charge-contract" }';

    const response =
      await app.inject({
        method:"POST",
        url:
          `/api/v1${activeHitPayWebhookPath(env.HITPAY_ENVIRONMENT)}`,
        headers:{
          "content-type":
            "application/json",
          "cf-connecting-ip":
            hitPayWebhookSourceIps(
              env.HITPAY_ENVIRONMENT,
            )[0],
          "hitpay-signature":
            webhookSignature(
              rawBody,
            ),
        },
        payload:
          rawBody,
      });

    assert.equal(
      response.statusCode,
      400,
    );
  },
);


test(
  "duplicate signed webhook is acknowledged without creating a new event",
  async (context) => {
    let createCalls = 0;
    const app =
      await billingTestApp({
        billingWebhookEvent:{
          findUnique:
            async () => ({
              id:
                "event-existing",
              workspaceBillingSubscriptionId:
                "billing-existing",
            }),
          create:
            async () => {
              createCalls += 1;
              throw new Error(
                "duplicate event must not be created",
              );
            },
        },
      });

    context.after(
      async () => app.close(),
    );

    const rawBody =
      '{"id":"charge-duplicate","status":"succeeded"}';

    const response =
      await app.inject({
        method:"POST",
        url:
          `/api/v1${activeHitPayWebhookPath(env.HITPAY_ENVIRONMENT)}`,
        headers:{
          "content-type":
            "application/json",
          "cf-connecting-ip":
            hitPayWebhookSourceIps(
              env.HITPAY_ENVIRONMENT,
            )[0],
          "hitpay-signature":
            webhookSignature(
              rawBody,
            ),
          "hitpay-event-object":
            "charge",
          "hitpay-event-type":
            "created",
        },
        payload:
          rawBody,
      });

    assert.equal(
      response.statusCode,
      200,
    );
    assert.deepEqual(
      response.json(),
      {
        received:
          true,
        duplicate:
          true,
        mapped:
          true,
        eventId:
          "event-existing",
        activationPerformed:
          false,
      },
    );
    assert.equal(
      createCalls,
      0,
    );
  },
);


test(
  "webhook rejects a missing Cloudflare source IP before persistence",
  async (context) => {
    const app =
      await billingTestApp();

    context.after(
      async () => app.close(),
    );

    const rawBody =
      '{"id":"charge-source-gate"}';

    const response =
      await app.inject({
        method:"POST",
        url:
          `/api/v1${activeHitPayWebhookPath(env.HITPAY_ENVIRONMENT)}`,
        headers:{
          "content-type":
            "application/json",
          "hitpay-signature":
            webhookSignature(
              rawBody,
            ),
          "hitpay-event-object":
            "charge",
          "hitpay-event-type":
            "created",
        },
        payload:
          rawBody,
      });

    assert.equal(
      response.statusCode,
      403,
    );
  },
);
