import assert from "node:assert/strict";
import test from "node:test";
import { BillingSettingsService } from "../src/modules/billing/billing-settings.service.js";

const superAdmin = {
  userId: "super-user",
  email: "pillo0404@gmail.com",
  workspaceId: "workspace-1",
};

const makeApp = (options?: { actorStatus?: string; actorEmail?: string }) => {
  let settings = {
    id: "global",
    annualDiscountPercent: 0,
    personalFamilyGraceDays: 3,
    businessGraceDays: 7,
    updatedByUserId: null as string | null,
    updatedByEmail: "system@imai.my" as string | null,
    version: 1,
    createdAt: new Date("2026-08-12T00:00:00.000Z"),
    updatedAt: new Date("2026-08-12T00:00:00.000Z"),
  };
  const audits: unknown[] = [];

  const tx = {
    billingSettings: {
      findUnique: async () => settings,
      updateMany: async ({ where, data }: any) => {
        if (where.id !== settings.id || where.version !== settings.version) {
          return { count: 0 };
        }
        settings = {
          ...settings,
          annualDiscountPercent: data.annualDiscountPercent,
          updatedByUserId: data.updatedByUserId,
          updatedByEmail: data.updatedByEmail,
          version: settings.version + 1,
          updatedAt: new Date("2026-08-12T01:00:00.000Z"),
        };
        return { count: 1 };
      },
    },
    billingSettingsAuditEvent: {
      create: async ({ data }: any) => {
        audits.push(data);
        return data;
      },
    },
  };

  const app = {
    prisma: {
      user: {
        findUnique: async () => ({
          id: superAdmin.userId,
          email: options?.actorEmail ?? superAdmin.email,
          status: options?.actorStatus ?? "ACTIVE",
        }),
      },
      billingSettings: tx.billingSettings,
      $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx),
    },
  };

  return { app, audits, readSettings: () => settings };
};

test("active Super Admin updates annual discount with audit and version guard", async () => {
  const fixture = makeApp();
  const service = new BillingSettingsService(fixture.app as never);

  const result = await service.updateAnnualDiscount(superAdmin, {
    annualDiscountPercent: 12.5,
    expectedVersion: 1,
  });

  assert.equal(result.annualDiscountPercent, 12.5);
  assert.equal(result.version, 2);
  assert.equal(fixture.audits.length, 1);
  assert.deepEqual(fixture.audits[0], {
    billingSettingsId: "global",
    actorUserId: superAdmin.userId,
    actorEmail: superAdmin.email,
    action: "ANNUAL_DISCOUNT_UPDATED",
    before: {
      annualDiscountPercent: 0,
      personalFamilyGraceDays: 3,
      businessGraceDays: 7,
      version: 1,
    },
    after: {
      annualDiscountPercent: 12.5,
      personalFamilyGraceDays: 3,
      businessGraceDays: 7,
      version: 2,
    },
  });
});

test("stale settings version is rejected without audit", async () => {
  const fixture = makeApp();
  const service = new BillingSettingsService(fixture.app as never);

  await assert.rejects(
    service.updateAnnualDiscount(superAdmin, {
      annualDiscountPercent: 10,
      expectedVersion: 99,
    }),
    (error: any) => error?.code === "BILLING_SETTINGS_CONFLICT",
  );
  assert.equal(fixture.audits.length, 0);
});

test("ordinary, inactive and mismatched identities cannot read or update settings", async () => {
  const ordinaryFixture = makeApp();
  const ordinaryService = new BillingSettingsService(ordinaryFixture.app as never);
  await assert.rejects(
    ordinaryService.getSettings({
      ...superAdmin,
      email: "user@example.com",
    }),
    (error: any) => error?.code === "SUPER_ADMIN_REQUIRED",
  );

  const inactiveFixture = makeApp({ actorStatus: "DISABLED" });
  const inactiveService = new BillingSettingsService(inactiveFixture.app as never);
  await assert.rejects(
    inactiveService.getSettings(superAdmin),
    (error: any) => error?.code === "SUPER_ADMIN_REQUIRED",
  );

  const mismatchedFixture = makeApp({ actorEmail: "other@example.com" });
  const mismatchedService = new BillingSettingsService(
    mismatchedFixture.app as never,
  );
  await assert.rejects(
    mismatchedService.getSettings(superAdmin),
    (error: any) => error?.code === "SUPER_ADMIN_REQUIRED",
  );
});
