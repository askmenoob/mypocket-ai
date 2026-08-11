import {
  createHash,
} from "node:crypto";

import {
  PrismaPg,
} from "@prisma/adapter-pg";

import {
  env,
} from "../src/config/index.js";
import {
  PrismaClient,
} from "../src/generated/prisma/client.js";
import {
  createPrismaPgOptions,
} from "../src/plugins/prisma-pg-tls-options.js";


type CountRow = {
  status:string;
  count:bigint;
};

type BillingAnomalyRow = {
  id:string;
  status:string;
  providerSubscriptionId:string | null;
  checkoutReference:string | null;
  lastPaymentAt:Date | null;
  lastPaymentStatus:string | null;
  lastWebhookAt:Date | null;
  updatedAt:Date;
};

type WebhookAnomalyRow = {
  id:string;
  status:string;
  eventObject:string;
  eventType:string;
  processedAt:Date | null;
  createdAt:Date;
};

type AccessMismatchRow = {
  id:string;
  billingStatus:string;
  billingPlan:string;
  accessStatus:string | null;
  accessPlan:string | null;
  workspaceType:string;
};


function fingerprint(
  value:string,
){
  return createHash(
    "sha256",
  )
    .update(value)
    .digest("hex")
    .slice(0, 12);
}


function ageMinutes(
  value:Date,
){
  return Math.max(
    0,
    Math.floor(
      (
        Date.now()
        - value.getTime()
      )
      /
      60000,
    ),
  );
}


const adapter =
  new PrismaPg(
    createPrismaPgOptions(
      env.DATABASE_URL,
    ),
  );
const prisma =
  new PrismaClient({
    adapter,
  });


try{
  await prisma.$connect();

  const billingCounts =
    await prisma.$queryRaw<CountRow[]>`
      SELECT
        "status",
        COUNT(*)::bigint AS "count"
      FROM "WorkspaceBillingSubscription"
      WHERE "provider" = 'HITPAY'
      GROUP BY "status"
      ORDER BY "status"
    `;

  const webhookCounts =
    await prisma.$queryRaw<CountRow[]>`
      SELECT
        "status",
        COUNT(*)::bigint AS "count"
      FROM "BillingWebhookEvent"
      WHERE "provider" = 'HITPAY'
      GROUP BY "status"
      ORDER BY "status"
    `;

  const billingAnomalies =
    await prisma.$queryRaw<BillingAnomalyRow[]>`
      SELECT
        "id",
        "status",
        "providerSubscriptionId",
        "checkoutReference",
        "lastPaymentAt",
        "lastPaymentStatus",
        "lastWebhookAt",
        "updatedAt"
      FROM "WorkspaceBillingSubscription"
      WHERE
        "provider" = 'HITPAY'
        AND (
          (
            "status" IN ('ACTIVE', 'SCHEDULED', 'RETRYING', 'PAUSED')
            AND "providerSubscriptionId" IS NULL
          )
          OR (
            "status" IN ('CHECKOUT_PENDING', 'PENDING')
            AND "updatedAt" < NOW() - INTERVAL '30 minutes'
          )
          OR (
            "status" = 'ACTIVE'
            AND (
              "lastPaymentAt" IS NULL
              OR COALESCE("lastPaymentStatus", '') <> 'SUCCEEDED'
            )
          )
        )
      ORDER BY "updatedAt"
    `;

  const webhookAnomalies =
    await prisma.$queryRaw<WebhookAnomalyRow[]>`
      SELECT
        "id",
        "status",
        "eventObject",
        "eventType",
        "processedAt",
        "createdAt"
      FROM "BillingWebhookEvent"
      WHERE
        "provider" = 'HITPAY'
        AND (
          "status" IN ('ERROR', 'RECEIVED_UNMAPPED')
          OR (
            "processedAt" IS NULL
            AND "createdAt" < NOW() - INTERVAL '5 minutes'
          )
        )
      ORDER BY "createdAt"
    `;

  const accessMismatches =
    await prisma.$queryRaw<AccessMismatchRow[]>`
      SELECT
        billing."id",
        billing."status" AS "billingStatus",
        billing."plan" AS "billingPlan",
        access."status" AS "accessStatus",
        access."plan" AS "accessPlan",
        workspace."type"::text AS "workspaceType"
      FROM "WorkspaceBillingSubscription" billing
      JOIN "Workspace" workspace
        ON workspace."id" = billing."workspaceId"
      LEFT JOIN "Subscription" access
        ON access."userId" = billing."ownerUserId"
      WHERE
        billing."provider" = 'HITPAY'
        AND (
          (
            billing."status" = 'ACTIVE'
            AND (
              access."status" IS DISTINCT FROM 'ACTIVE'
              OR access."plan" IS DISTINCT FROM billing."plan"
              OR workspace."type"::text IS DISTINCT FROM
                CASE billing."plan"
                  WHEN 'FAMILY' THEN 'FAMILY'
                  WHEN 'BUSINESS' THEN 'BUSINESS'
                  ELSE 'PERSONAL'
                END
            )
          )
          OR (
            billing."status" IN ('INACTIVE', 'EXPIRED')
            AND access."status" = 'ACTIVE'
            AND access."plan" <> 'FREE'
          )
        )
      ORDER BY billing."updatedAt"
    `;

  const report = {
    generatedAt:
      new Date().toISOString(),
    environment:
      env.HITPAY_ENVIRONMENT,
    provider:
      "HITPAY",
    mutationPerformed:
      false,
    statusCounts:{
      billing:
        Object.fromEntries(
          billingCounts.map(
            (row) => [
              row.status,
              Number(row.count),
            ],
          ),
        ),
      webhook:
        Object.fromEntries(
          webhookCounts.map(
            (row) => [
              row.status,
              Number(row.count),
            ],
          ),
        ),
    },
    anomalies:{
      billing:
        billingAnomalies.map(
          (row) => ({
            fingerprint:
              fingerprint(row.id),
            status:
              row.status,
            providerSubscriptionPresent:
              Boolean(row.providerSubscriptionId),
            checkoutReferencePresent:
              Boolean(row.checkoutReference),
            lastPaymentPresent:
              Boolean(row.lastPaymentAt),
            lastPaymentStatus:
              row.lastPaymentStatus,
            lastWebhookPresent:
              Boolean(row.lastWebhookAt),
            ageMinutes:
              ageMinutes(row.updatedAt),
          }),
        ),
      webhook:
        webhookAnomalies.map(
          (row) => ({
            fingerprint:
              fingerprint(row.id),
            status:
              row.status,
            event:
              `${row.eventObject}.${row.eventType}`,
            processed:
              Boolean(row.processedAt),
            ageMinutes:
              ageMinutes(row.createdAt),
          }),
        ),
      access:
        accessMismatches.map(
          (row) => ({
            fingerprint:
              fingerprint(row.id),
            billingStatus:
              row.billingStatus,
            billingPlan:
              row.billingPlan,
            accessStatus:
              row.accessStatus,
            accessPlan:
              row.accessPlan,
            workspaceType:
              row.workspaceType,
          }),
        ),
    },
  };

  console.log(
    JSON.stringify(
      report,
      null,
      2,
    ),
  );
}finally{
  await prisma.$disconnect();
}
