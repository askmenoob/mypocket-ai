import type { FastifyInstance } from "fastify";
import type { Prisma } from "../../generated/prisma/client.js";
import { isSuperAdminEmail } from "../../shared/auth/super-admin.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { UpdateBillingAnnualDiscountInput } from "./billing-settings.schemas.js";

type BillingSettingsActor = {
  userId: string;
  email: string;
  workspaceId: string;
};

export class BillingSettingsService {
  constructor(private readonly app: FastifyInstance) {}

  async getSettings(actor: BillingSettingsActor) {
    await this.assertSuperAdminActor(actor);
    const settings = await this.app.prisma.billingSettings.findUnique({
      where: { id: "global" },
    });
    if (!settings) {
      throw new AppError(
        "BILLING_SETTINGS_MISSING",
        "Global billing settings are unavailable.",
        503,
      );
    }
    return this.snapshot(settings);
  }

  async updateAnnualDiscount(
    actor: BillingSettingsActor,
    input: UpdateBillingAnnualDiscountInput,
  ) {
    const verifiedActor = await this.assertSuperAdminActor(actor);

    return this.app.prisma.$transaction(
      async (tx) => {
        const current = await tx.billingSettings.findUnique({
          where: { id: "global" },
        });
        if (!current) {
          throw new AppError(
            "BILLING_SETTINGS_MISSING",
            "Global billing settings are unavailable.",
            503,
          );
        }

        const before = this.snapshot(current);
        const updatedCount = await tx.billingSettings.updateMany({
          where: {
            id: "global",
            version: input.expectedVersion,
          },
          data: {
            annualDiscountPercent: input.annualDiscountPercent,
            updatedByUserId: verifiedActor.userId,
            updatedByEmail: verifiedActor.email,
            version: { increment: 1 },
          },
        });
        if (updatedCount.count !== 1) {
          throw new AppError(
            "BILLING_SETTINGS_CONFLICT",
            "Billing settings changed in another session. Refresh and try again.",
            409,
          );
        }

        const updated = await tx.billingSettings.findUnique({
          where: { id: "global" },
        });
        if (!updated) {
          throw new AppError(
            "BILLING_SETTINGS_MISSING",
            "Global billing settings are unavailable.",
            503,
          );
        }
        const after = this.snapshot(updated);

        await tx.billingSettingsAuditEvent.create({
          data: {
            billingSettingsId: "global",
            actorUserId: verifiedActor.userId,
            actorEmail: verifiedActor.email,
            action: "ANNUAL_DISCOUNT_UPDATED",
            before: before as Prisma.InputJsonValue,
            after: after as Prisma.InputJsonValue,
          },
        });

        return after;
      },
      { isolationLevel: "Serializable" },
    );
  }

  private async assertSuperAdminActor(actor: BillingSettingsActor) {
    if (!isSuperAdminEmail(actor.email)) {
      throw new AppError(
        "SUPER_ADMIN_REQUIRED",
        "Only Super Admin can manage billing settings.",
        403,
      );
    }

    const current = await this.app.prisma.user.findUnique({
      where: { id: actor.userId },
      select: { id: true, email: true, status: true },
    });
    if (
      !current ||
      current.status !== "ACTIVE" ||
      !isSuperAdminEmail(current.email) ||
      current.email.trim().toLowerCase() !== actor.email.trim().toLowerCase()
    ) {
      throw new AppError(
        "SUPER_ADMIN_REQUIRED",
        "Active Super Admin identity is required.",
        403,
      );
    }

    return { userId: current.id, email: current.email };
  }

  private snapshot(settings: {
    annualDiscountPercent: unknown;
    personalFamilyGraceDays: number;
    businessGraceDays: number;
    version: number;
  }) {
    return {
      annualDiscountPercent: Number(settings.annualDiscountPercent),
      personalFamilyGraceDays: settings.personalFamilyGraceDays,
      businessGraceDays: settings.businessGraceDays,
      version: settings.version,
    };
  }
}
