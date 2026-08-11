import { z } from "zod";

export const PromotionPlanSchema = z.enum([
  "PERSONAL_PRO",
  "FAMILY",
  "BUSINESS",
]);

export const PromotionTypeSchema = z.enum([
  "FREE_TRIAL_DAYS",
  "PERCENTAGE",
  "FIXED_AMOUNT",
]);

export const PromotionStatusSchema = z.enum([
  "DRAFT",
  "ENABLED",
  "DISABLED",
  "EXPIRED",
  "ARCHIVED",
]);

export const PromotionFirstChargeBehaviorSchema = z.enum([
  "CHARGE_DISCOUNTED_NOW",
  "DEFER_UNTIL_TRIAL_END",
]);

const CampaignFieldsSchema = z.object({
  code: z.string().trim().min(3).max(32)
    .transform((value) => value.toUpperCase().replace(/\s+/gu, "-"))
    .pipe(z.string().regex(/^[A-Z0-9][A-Z0-9_-]{2,31}$/u)),
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  type: PromotionTypeSchema,
  firstChargeBehavior: PromotionFirstChargeBehaviorSchema,
  discountValue: z.coerce.number().min(0).max(999999),
  freeTrialDays: z.coerce.number().int().min(1).max(365).nullable(),
  currency: z.literal("MYR").default("MYR"),
  applicablePlans: z.array(PromotionPlanSchema).min(1).max(20)
    .transform((plans) => [...new Set(plans)])
    .pipe(z.array(PromotionPlanSchema).max(3)),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  totalRedemptionLimit: z.coerce.number().int().min(1).max(10_000_000).nullable(),
  perUserRedemptionLimit: z.coerce.number().int().min(1).max(100),
  newUsersOnly: z.boolean(),
  requiresPaymentMethod: z.boolean(),
  autoConvert: z.boolean(),
});

function validateCampaignCombination(
  value:z.infer<typeof CampaignFieldsSchema>,
  context:z.RefinementCtx,
):void{
  if(value.endsAt <= value.startsAt){
    context.addIssue({ code: "custom", path: ["endsAt"], message: "Promotion end must be after start" });
  }
  if(
    value.type === "FREE_TRIAL_DAYS"
    && (
      value.freeTrialDays === null
      || value.discountValue !== 0
      || value.firstChargeBehavior !== "DEFER_UNTIL_TRIAL_END"
    )
  ){
    context.addIssue({ code: "custom", path: ["type"], message: "Free trials require days, zero discount value and deferred first charge" });
  }
  if(
    value.type !== "FREE_TRIAL_DAYS"
    && (
      value.freeTrialDays !== null
      || value.discountValue <= 0
      || value.firstChargeBehavior !== "CHARGE_DISCOUNTED_NOW"
    )
  ){
    context.addIssue({ code: "custom", path: ["type"], message: "Discount promotions require a positive value and immediate discounted charge" });
  }
  if(value.type === "PERCENTAGE" && value.discountValue > 100){
    context.addIssue({ code: "custom", path: ["discountValue"], message: "Percentage cannot exceed 100" });
  }
}

export const CreatePromotionCampaignSchema =
  CampaignFieldsSchema.superRefine(validateCampaignCombination);

export const UpdatePromotionCampaignSchema =
  CampaignFieldsSchema.partial().refine(
    (value) => Object.keys(value).length > 0,
    "At least one promotion field is required",
  );

export const PromotionTransitionSchema = z.object({
  status: PromotionStatusSchema.exclude(["DRAFT"]),
});

export const PromotionQuoteSchema = z.object({
  code: z.string().trim().min(3).max(32),
  plan: PromotionPlanSchema,
  originalAmount: z.coerce.number().positive().max(999999),
  currency: z.literal("MYR").default("MYR"),
  paymentMethodAttached: z.boolean().default(false),
});

export const PromotionRedeemSchema = PromotionQuoteSchema.extend({
  idempotencyKey: z.string().trim().min(16).max(128),
});

export const PromotionAdminQuerySchema = z.object({
  campaignId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export type CreatePromotionCampaignInput = z.infer<typeof CreatePromotionCampaignSchema>;
export type UpdatePromotionCampaignInput = z.infer<typeof UpdatePromotionCampaignSchema>;
export type PromotionQuoteInput = z.infer<typeof PromotionQuoteSchema>;
export type PromotionRedeemInput = z.infer<typeof PromotionRedeemSchema>;
