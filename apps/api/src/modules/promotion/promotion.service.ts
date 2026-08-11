import type { FastifyInstance } from "fastify";

import type {
  PromoCampaign,
  Prisma,
} from "../../generated/prisma/client.js";
import { isSuperAdminEmail } from "../../shared/auth/super-admin.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  assertCampaignTransition,
  buildPromotionDisclosure,
  evaluatePromotionEligibility,
  normalizePromotionCode,
  promotionIdempotencyKey,
  type PromotionPolicyCampaign,
  type PromotionStatus,
} from "./promotion.policy.js";
import {
  CreatePromotionCampaignSchema,
  type CreatePromotionCampaignInput,
  type PromotionQuoteInput,
  type PromotionRedeemInput,
  type UpdatePromotionCampaignInput,
} from "./promotion.schemas.js";

type PromotionActor = {
  userId:string;
  email:string;
  workspaceId:string;
};

function isUniqueConstraintError(error:unknown):boolean{
  return Boolean(
    error
    && typeof error === "object"
    && "code" in error
    && error.code === "P2002",
  );
}

function isSerializationConflict(error:unknown):boolean{
  return Boolean(
    error
    && typeof error === "object"
    && "code" in error
    && error.code === "P2034",
  );
}

export class PromotionService {
  constructor(
    private readonly app:FastifyInstance,
  ){}

  async listCampaigns(actor:PromotionActor){
    await this.assertSuperAdminActor(actor);

    const campaigns = await this.app.prisma.promoCampaign.findMany({
      include:{ _count:{ select:{ redemptions:true } } },
      orderBy:[{ createdAt:"desc" }, { code:"asc" }],
    });

    return campaigns.map((campaign) => ({
      ...this.campaignSnapshot(campaign),
      redemptionCount: campaign._count.redemptions,
    }));
  }

  async createCampaign(
    actor:PromotionActor,
    input:CreatePromotionCampaignInput,
  ){
    const verifiedActor = await this.assertSuperAdminActor(actor);

    try{
      return await this.app.prisma.$transaction(async (tx) => {
        const campaign = await tx.promoCampaign.create({
          data:{
            ...input,
            description: input.description ?? null,
            code: normalizePromotionCode(input.code),
            status:"DRAFT",
            createdByEmail: verifiedActor.email,
            updatedByEmail: verifiedActor.email,
          },
        });

        await tx.promoAuditEvent.create({
          data:{
            promoCampaignId: campaign.id,
            actorUserId: verifiedActor.userId,
            actorEmail: verifiedActor.email,
            action:"CAMPAIGN_CREATED",
            after: this.campaignSnapshot(campaign) as Prisma.InputJsonValue,
          },
        });

        return this.campaignSnapshot(campaign);
      });
    }catch(error){
      if(isUniqueConstraintError(error)){
        throw new AppError("PROMO_CODE_EXISTS", "Promotion code already exists", 409);
      }
      throw error;
    }
  }

  async updateCampaign(
    actor:PromotionActor,
    campaignId:string,
    patch:UpdatePromotionCampaignInput,
  ){
    const verifiedActor = await this.assertSuperAdminActor(actor);

    try{
      return await this.app.prisma.$transaction(async (tx) => {
        const current = await tx.promoCampaign.findUnique({ where:{ id:campaignId } });
        if(!current){
          throw new AppError("PROMO_NOT_FOUND", "Promotion not found", 404);
        }
        if(!["DRAFT", "DISABLED"].includes(current.status)){
          throw new AppError(
            "PROMO_EDIT_REQUIRES_DISABLED",
            "Disable the promotion before editing it",
            409,
          );
        }

        const merged = CreatePromotionCampaignSchema.parse({
          ...this.campaignInputSnapshot(current),
          ...patch,
          code: patch.code ? normalizePromotionCode(patch.code) : current.code,
        });
        const updated = await tx.promoCampaign.update({
          where:{ id:campaignId },
          data:{
            ...merged,
            description: merged.description ?? null,
            updatedByEmail: verifiedActor.email,
          },
        });

        await tx.promoAuditEvent.create({
          data:{
            promoCampaignId: campaignId,
            actorUserId: verifiedActor.userId,
            actorEmail: verifiedActor.email,
            action:"CAMPAIGN_UPDATED",
            before: this.campaignSnapshot(current) as Prisma.InputJsonValue,
            after: this.campaignSnapshot(updated) as Prisma.InputJsonValue,
          },
        });

        return this.campaignSnapshot(updated);
      });
    }catch(error){
      if(isUniqueConstraintError(error)){
        throw new AppError("PROMO_CODE_EXISTS", "Promotion code already exists", 409);
      }
      throw error;
    }
  }

  async transitionCampaign(
    actor:PromotionActor,
    campaignId:string,
    nextStatus:Exclude<PromotionStatus, "DRAFT">,
  ){
    const verifiedActor = await this.assertSuperAdminActor(actor);

    return this.app.prisma.$transaction(async (tx) => {
      const current = await tx.promoCampaign.findUnique({ where:{ id:campaignId } });
      if(!current){
        throw new AppError("PROMO_NOT_FOUND", "Promotion not found", 404);
      }

      try{
        assertCampaignTransition(current.status, nextStatus);
      }catch{
        throw new AppError(
          "PROMO_INVALID_STATUS_TRANSITION",
          `Promotion cannot move from ${current.status} to ${nextStatus}`,
          409,
        );
      }

      const now = new Date();
      if(nextStatus === "ENABLED" && (current.startsAt >= current.endsAt || now >= current.endsAt)){
        throw new AppError("PROMO_INVALID_VALIDITY", "Promotion validity window has ended", 409);
      }

      const updated = await tx.promoCampaign.update({
        where:{ id:campaignId },
        data:{
          status: nextStatus,
          archivedAt: nextStatus === "ARCHIVED" ? now : null,
          updatedByEmail: verifiedActor.email,
        },
      });
      await tx.promoAuditEvent.create({
        data:{
          promoCampaignId: campaignId,
          actorUserId: verifiedActor.userId,
          actorEmail: verifiedActor.email,
          action:`CAMPAIGN_${nextStatus}`,
          before:{ status:current.status },
          after:{ status:updated.status },
        },
      });

      return this.campaignSnapshot(updated);
    });
  }

  async quote(actor:PromotionActor, input:PromotionQuoteInput){
    const now = new Date();
    const campaign = await this.app.prisma.promoCampaign.findUnique({
      where:{ code:normalizePromotionCode(input.code) },
    });
    if(!campaign){
      throw new AppError("PROMO_NOT_FOUND", "Promotion code is not valid", 404);
    }

    const eligibility = await this.eligibilityContext(
      this.app.prisma,
      campaign,
      actor.userId,
      input,
      now,
    );
    const disclosure = buildPromotionDisclosure({
      campaign:this.toPolicyCampaign(campaign),
      originalAmount:input.originalAmount,
      currency:input.currency,
      now,
    });

    return {
      campaign:{ code:campaign.code, name:campaign.name, type:campaign.type },
      ...eligibility,
      disclosure,
    };
  }

  async redeem(actor:PromotionActor, input:PromotionRedeemInput){
    const normalizedCode = normalizePromotionCode(input.code);
    let hashedKey = "";

    for(let attempt = 1; attempt <= 3; attempt += 1){
      try{
        return await this.app.prisma.$transaction(async (tx) => {
        const campaign = await tx.promoCampaign.findUnique({
          where:{ code:normalizedCode },
        });
        if(!campaign){
          throw new AppError("PROMO_NOT_FOUND", "Promotion code is not valid", 404);
        }

        hashedKey = promotionIdempotencyKey(actor.userId, campaign.id, input.idempotencyKey);
        const replay = await tx.promoRedemption.findUnique({ where:{ idempotencyKey:hashedKey } });
        if(replay){
          if(replay.userId !== actor.userId || replay.promoCampaignId !== campaign.id){
            throw new AppError("PROMO_IDEMPOTENCY_CONFLICT", "Idempotency key conflict", 409);
          }
          return { replayed:true, redemption:this.redemptionSnapshot(replay) };
        }

        const now = new Date();
        const eligibility = await this.eligibilityContext(tx, campaign, actor.userId, input, now);
        if(!eligibility.eligible){
          throw new AppError(
            "PROMO_NOT_ELIGIBLE",
            `Promotion is not eligible: ${eligibility.reasons.join(",")}`,
            409,
          );
        }

        const user = await tx.user.findUnique({
          where:{ id:actor.userId },
          select:{ email:true },
        });
        if(!user || user.email.trim().toLowerCase() !== actor.email.trim().toLowerCase()){
          throw new AppError("PROMO_ACTOR_MISMATCH", "Promotion actor is invalid", 403);
        }

        const disclosure = buildPromotionDisclosure({
          campaign:this.toPolicyCampaign(campaign),
          originalAmount:input.originalAmount,
          currency:input.currency,
          now,
        });
        const isTrial = campaign.type === "FREE_TRIAL_DAYS";
        const redemption = await tx.promoRedemption.create({
          data:{
            promoCampaignId:campaign.id,
            userId:actor.userId,
            userEmailSnapshot:user.email,
            workspaceId:actor.workspaceId,
            plan:input.plan,
            status:isTrial ? "ACTIVE" : "RESERVED",
            idempotencyKey:hashedKey,
            currency:input.currency,
            originalAmount:input.originalAmount,
            discountAmount:disclosure.discountAmount,
            firstChargeAmount:disclosure.firstChargeAmount,
            trialEndsAt:disclosure.trialEndsAt ? new Date(disclosure.trialEndsAt) : null,
            nextChargeAt:disclosure.nextChargeAt ? new Date(disclosure.nextChargeAt) : null,
            nextChargeAmount:disclosure.nextChargeAmount,
            cancelBefore:disclosure.cancelBefore ? new Date(disclosure.cancelBefore) : null,
            paymentMethodAttached:input.paymentMethodAttached,
            activatedAt:isTrial ? now : null,
          },
        });
        await tx.promoAuditEvent.create({
          data:{
            promoCampaignId:campaign.id,
            promoRedemptionId:redemption.id,
            actorUserId:actor.userId,
            actorEmail:user.email,
            action:"PROMO_REDEEMED",
            after:this.redemptionSnapshot(redemption) as Prisma.InputJsonValue,
          },
        });

        return { replayed:false, redemption:this.redemptionSnapshot(redemption), disclosure };
        }, { isolationLevel:"Serializable" });
      }catch(error){
        if(isSerializationConflict(error) && attempt < 3){
          continue;
        }
        if(isUniqueConstraintError(error) && hashedKey){
          const replay = await this.app.prisma.promoRedemption.findUnique({
            where:{ idempotencyKey:hashedKey },
          });
          if(replay && replay.userId === actor.userId){
            return { replayed:true, redemption:this.redemptionSnapshot(replay) };
          }
        }
        if(isSerializationConflict(error)){
          throw new AppError(
            "PROMO_CONCURRENT_REDEMPTION_RETRY",
            "Promotion redemption was busy; retry with the same idempotency key",
            409,
          );
        }
        throw error;
      }
    }

    throw new AppError("PROMO_REDEMPTION_FAILED", "Promotion redemption failed", 409);
  }

  async cancelRedemption(actor:PromotionActor, redemptionId:string){
    return this.app.prisma.$transaction(async (tx) => {
      const current = await tx.promoRedemption.findUnique({ where:{ id:redemptionId } });
      if(!current || current.userId !== actor.userId || current.workspaceId !== actor.workspaceId){
        throw new AppError("PROMO_REDEMPTION_NOT_FOUND", "Promotion redemption not found", 404);
      }
      if(!["RESERVED", "ACTIVE"].includes(current.status)){
        throw new AppError("PROMO_REDEMPTION_FINAL", "Promotion redemption is already final", 409);
      }
      const now = new Date();
      if(current.cancelBefore && now >= current.cancelBefore){
        throw new AppError("PROMO_CANCELLATION_CLOSED", "Promotion cancellation deadline has passed", 409);
      }

      const updated = await tx.promoRedemption.update({
        where:{ id:redemptionId },
        data:{ status:"CANCELLED", cancelledAt:now },
      });
      await tx.promoAuditEvent.create({
        data:{
          promoCampaignId:current.promoCampaignId,
          promoRedemptionId:current.id,
          actorUserId:actor.userId,
          actorEmail:actor.email,
          action:"PROMO_CANCELLED",
          before:{ status:current.status },
          after:{ status:updated.status, cancelledAt:now.toISOString() },
        },
      });
      return this.redemptionSnapshot(updated);
    });
  }

  async listUsage(actor:PromotionActor, campaignId:string | undefined, limit:number){
    await this.assertSuperAdminActor(actor);
    const rows = await this.app.prisma.promoRedemption.findMany({
      where:campaignId ? { promoCampaignId:campaignId } : undefined,
      include:{ campaign:{ select:{ code:true, name:true } } },
      orderBy:{ redeemedAt:"desc" },
      take:limit,
    });
    return rows.map((row) => ({
      ...this.redemptionSnapshot(row),
      campaign:row.campaign,
    }));
  }

  async listAudit(actor:PromotionActor, campaignId:string | undefined, limit:number){
    await this.assertSuperAdminActor(actor);
    return this.app.prisma.promoAuditEvent.findMany({
      where:campaignId ? { promoCampaignId:campaignId } : undefined,
      orderBy:{ createdAt:"desc" },
      take:limit,
    });
  }

  private async assertSuperAdminActor(actor:PromotionActor){
    if(!isSuperAdminEmail(actor.email)){
      throw new AppError("SUPER_ADMIN_REQUIRED", "Only Super Admin can manage promotion settings", 403);
    }
    const current = await this.app.prisma.user.findUnique({
      where:{ id:actor.userId },
      select:{ id:true, email:true, status:true },
    });
    if(
      !current
      || current.status !== "ACTIVE"
      || !isSuperAdminEmail(current.email)
      || current.email.trim().toLowerCase() !== actor.email.trim().toLowerCase()
    ){
      throw new AppError("SUPER_ADMIN_REQUIRED", "Active Super Admin identity is required", 403);
    }
    return { userId:current.id, email:current.email };
  }

  private async eligibilityContext(
    prisma:Prisma.TransactionClient | FastifyInstance["prisma"],
    campaign:PromoCampaign,
    userId:string,
    input:PromotionQuoteInput,
    now:Date,
  ){
    const [user, totalRedemptions, userRedemptions, priorPaidSubscriptions] = await Promise.all([
      prisma.user.findUnique({ where:{ id:userId }, select:{ createdAt:true } }),
      prisma.promoRedemption.count({ where:{ promoCampaignId:campaign.id } }),
      prisma.promoRedemption.count({ where:{ promoCampaignId:campaign.id, userId } }),
      prisma.workspaceBillingSubscription.count({
        where:{ ownerUserId:userId, lastPaymentAt:{ not:null } },
      }),
    ]);
    if(!user){
      throw new AppError("PROMO_USER_NOT_FOUND", "Promotion user not found", 404);
    }
    return evaluatePromotionEligibility({
      campaign:this.toPolicyCampaign(campaign),
      now,
      requestedPlan:input.plan,
      totalRedemptions,
      userRedemptions,
      userCreatedAt:user.createdAt,
      hasPriorPaidSubscription:priorPaidSubscriptions > 0,
      paymentMethodAttached:input.paymentMethodAttached,
    });
  }

  private toPolicyCampaign(campaign:PromoCampaign):PromotionPolicyCampaign{
    return {
      ...campaign,
      discountValue:Number(campaign.discountValue),
      status:campaign.status,
      type:campaign.type,
      firstChargeBehavior:campaign.firstChargeBehavior,
    };
  }

  private campaignInputSnapshot(campaign:PromoCampaign){
    return {
      code:campaign.code,
      name:campaign.name,
      description:campaign.description,
      type:campaign.type,
      firstChargeBehavior:campaign.firstChargeBehavior,
      discountValue:Number(campaign.discountValue),
      freeTrialDays:campaign.freeTrialDays,
      currency:campaign.currency,
      applicablePlans:campaign.applicablePlans,
      startsAt:campaign.startsAt,
      endsAt:campaign.endsAt,
      totalRedemptionLimit:campaign.totalRedemptionLimit,
      perUserRedemptionLimit:campaign.perUserRedemptionLimit,
      newUsersOnly:campaign.newUsersOnly,
      requiresPaymentMethod:campaign.requiresPaymentMethod,
      autoConvert:campaign.autoConvert,
    };
  }

  private campaignSnapshot(campaign:PromoCampaign){
    return {
      id:campaign.id,
      ...this.campaignInputSnapshot(campaign),
      startsAt:campaign.startsAt.toISOString(),
      endsAt:campaign.endsAt.toISOString(),
      status:campaign.status,
      archivedAt:campaign.archivedAt?.toISOString() ?? null,
      createdByEmail:campaign.createdByEmail,
      updatedByEmail:campaign.updatedByEmail,
      createdAt:campaign.createdAt.toISOString(),
      updatedAt:campaign.updatedAt.toISOString(),
    };
  }

  private redemptionSnapshot(redemption:{
    id:string;
    promoCampaignId:string;
    userId:string;
    userEmailSnapshot:string;
    workspaceId:string;
    plan:string;
    status:string;
    currency:string;
    originalAmount:unknown;
    discountAmount:unknown;
    firstChargeAmount:unknown;
    trialEndsAt:Date | null;
    nextChargeAt:Date | null;
    nextChargeAmount:unknown | null;
    cancelBefore:Date | null;
    paymentMethodAttached:boolean;
    redeemedAt:Date;
    activatedAt:Date | null;
    convertedAt:Date | null;
    cancelledAt:Date | null;
    expiredAt:Date | null;
  }){
    return {
      id:redemption.id,
      campaignId:redemption.promoCampaignId,
      userId:redemption.userId,
      userEmail:redemption.userEmailSnapshot,
      workspaceId:redemption.workspaceId,
      plan:redemption.plan,
      status:redemption.status,
      currency:redemption.currency,
      originalAmount:Number(redemption.originalAmount),
      discountAmount:Number(redemption.discountAmount),
      firstChargeAmount:Number(redemption.firstChargeAmount),
      trialEndsAt:redemption.trialEndsAt?.toISOString() ?? null,
      nextChargeAt:redemption.nextChargeAt?.toISOString() ?? null,
      nextChargeAmount:redemption.nextChargeAmount === null ? null : Number(redemption.nextChargeAmount),
      cancelBefore:redemption.cancelBefore?.toISOString() ?? null,
      paymentMethodAttached:redemption.paymentMethodAttached,
      redeemedAt:redemption.redeemedAt.toISOString(),
      activatedAt:redemption.activatedAt?.toISOString() ?? null,
      convertedAt:redemption.convertedAt?.toISOString() ?? null,
      cancelledAt:redemption.cancelledAt?.toISOString() ?? null,
      expiredAt:redemption.expiredAt?.toISOString() ?? null,
    };
  }
}
