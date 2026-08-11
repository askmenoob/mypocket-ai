import { createHash } from "node:crypto";

export type PromotionStatus =
  | "DRAFT"
  | "ENABLED"
  | "DISABLED"
  | "EXPIRED"
  | "ARCHIVED";

export type PromotionType =
  | "FREE_TRIAL_DAYS"
  | "PERCENTAGE"
  | "FIXED_AMOUNT";

export type PromotionFirstChargeBehavior =
  | "CHARGE_DISCOUNTED_NOW"
  | "DEFER_UNTIL_TRIAL_END";

export type PromotionPolicyCampaign = {
  id:string;
  code:string;
  status:PromotionStatus;
  type:PromotionType;
  firstChargeBehavior:PromotionFirstChargeBehavior;
  discountValue:number;
  freeTrialDays:number | null;
  applicablePlans:string[];
  startsAt:Date;
  endsAt:Date;
  totalRedemptionLimit:number | null;
  perUserRedemptionLimit:number;
  newUsersOnly:boolean;
  requiresPaymentMethod:boolean;
  autoConvert:boolean;
  createdAt:Date;
};

export type PromotionEligibilityReason =
  | "CAMPAIGN_NOT_ENABLED"
  | "CAMPAIGN_NOT_STARTED"
  | "CAMPAIGN_EXPIRED"
  | "PLAN_NOT_APPLICABLE"
  | "TOTAL_LIMIT_REACHED"
  | "PER_USER_LIMIT_REACHED"
  | "NEW_USERS_ONLY"
  | "PAYMENT_METHOD_REQUIRED";

export function normalizePromotionCode(
  value:string,
):string{
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/gu, "-");
}

export function evaluatePromotionEligibility(
  input:{
    campaign:PromotionPolicyCampaign;
    now:Date;
    requestedPlan:string;
    totalRedemptions:number;
    userRedemptions:number;
    userCreatedAt:Date;
    hasPriorPaidSubscription:boolean;
    paymentMethodAttached:boolean;
  },
):{
  eligible:boolean;
  reasons:PromotionEligibilityReason[];
}{
  const reasons:PromotionEligibilityReason[] = [];

  if(input.campaign.status !== "ENABLED"){
    reasons.push("CAMPAIGN_NOT_ENABLED");
  }
  if(input.now < input.campaign.startsAt){
    reasons.push("CAMPAIGN_NOT_STARTED");
  }
  if(input.now >= input.campaign.endsAt){
    reasons.push("CAMPAIGN_EXPIRED");
  }
  if(!input.campaign.applicablePlans.includes(input.requestedPlan)){
    reasons.push("PLAN_NOT_APPLICABLE");
  }
  if(
    input.campaign.totalRedemptionLimit !== null
    && input.totalRedemptions >= input.campaign.totalRedemptionLimit
  ){
    reasons.push("TOTAL_LIMIT_REACHED");
  }
  if(input.userRedemptions >= input.campaign.perUserRedemptionLimit){
    reasons.push("PER_USER_LIMIT_REACHED");
  }
  if(
    input.campaign.newUsersOnly
    && (
      input.userCreatedAt < input.campaign.createdAt
      || input.hasPriorPaidSubscription
    )
  ){
    reasons.push("NEW_USERS_ONLY");
  }
  if(input.campaign.requiresPaymentMethod && !input.paymentMethodAttached){
    reasons.push("PAYMENT_METHOD_REQUIRED");
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

function roundCurrency(value:number):number{
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateFirstCharge(
  type:PromotionType,
  discountValue:number,
  originalAmount:number,
):{
  discountAmount:number;
  firstChargeAmount:number;
}{
  const safeOriginal = Math.max(0, roundCurrency(originalAmount));
  let discountAmount = 0;

  if(type === "FREE_TRIAL_DAYS"){
    discountAmount = safeOriginal;
  }else if(type === "PERCENTAGE"){
    const safePercentage = Math.min(100, Math.max(0, discountValue));
    discountAmount = roundCurrency(safeOriginal * safePercentage / 100);
  }else{
    discountAmount = Math.max(0, roundCurrency(discountValue));
  }

  discountAmount = Math.min(safeOriginal, discountAmount);

  return {
    discountAmount,
    firstChargeAmount: roundCurrency(safeOriginal - discountAmount),
  };
}

function addUtcDays(date:Date, days:number):Date{
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function buildPromotionDisclosure(
  input:{
    campaign:PromotionPolicyCampaign;
    originalAmount:number;
    currency:string;
    now:Date;
  },
):{
  code:string;
  firstChargeAmount:number;
  discountAmount:number;
  trialEndsAt:string | null;
  nextChargeAt:string | null;
  nextChargeAmount:number | null;
  cancelBefore:string | null;
  requiresPaymentMethod:boolean;
  autoConvert:boolean;
  summary:string;
}{
  const charge = calculateFirstCharge(
    input.campaign.type,
    input.campaign.discountValue,
    input.originalAmount,
  );
  const isTrial = input.campaign.type === "FREE_TRIAL_DAYS";
  const trialEnds = isTrial
    ? addUtcDays(input.now, input.campaign.freeTrialDays ?? 0)
    : null;
  const nextChargeAt = trialEnds && input.campaign.autoConvert
    ? trialEnds.toISOString()
    : null;
  const nextChargeAmount = nextChargeAt
    ? roundCurrency(input.originalAmount)
    : null;
  const currencyLabel = input.currency === "MYR"
    ? "RM"
    : `${input.currency} `;
  const summary = trialEnds
    ? `Free until ${trialEnds.toISOString()}. Cancel before activation to avoid the next ${currencyLabel}${roundCurrency(input.originalAmount).toFixed(2)} charge.`
    : `First charge ${currencyLabel}${charge.firstChargeAmount.toFixed(2)} after a ${currencyLabel}${charge.discountAmount.toFixed(2)} discount.`;

  return {
    code: input.campaign.code,
    firstChargeAmount: charge.firstChargeAmount,
    discountAmount: charge.discountAmount,
    trialEndsAt: trialEnds?.toISOString() ?? null,
    nextChargeAt,
    nextChargeAmount,
    cancelBefore: trialEnds?.toISOString() ?? null,
    requiresPaymentMethod: input.campaign.requiresPaymentMethod,
    autoConvert: input.campaign.autoConvert,
    summary,
  };
}

const PROMOTION_TRANSITIONS:Record<PromotionStatus, PromotionStatus[]> = {
  DRAFT: ["ENABLED", "ARCHIVED"],
  ENABLED: ["DISABLED", "EXPIRED", "ARCHIVED"],
  DISABLED: ["ENABLED", "EXPIRED", "ARCHIVED"],
  EXPIRED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function assertCampaignTransition(
  current:PromotionStatus,
  next:PromotionStatus,
):void{
  if(!PROMOTION_TRANSITIONS[current].includes(next)){
    throw new Error(`PROMO_INVALID_STATUS_TRANSITION:${current}:${next}`);
  }
}

export type PromotionRedemptionStatus =
  | "RESERVED"
  | "ACTIVE"
  | "CONVERTED"
  | "CANCELLED"
  | "EXPIRED";

const REDEMPTION_TRANSITIONS:Record<PromotionRedemptionStatus, PromotionRedemptionStatus[]> = {
  RESERVED:["ACTIVE", "CANCELLED", "EXPIRED"],
  ACTIVE:["CONVERTED", "CANCELLED", "EXPIRED"],
  CONVERTED:[],
  CANCELLED:[],
  EXPIRED:[],
};

export function assertRedemptionTransition(
  current:PromotionRedemptionStatus,
  next:PromotionRedemptionStatus,
):void{
  if(!REDEMPTION_TRANSITIONS[current].includes(next)){
    throw new Error(`PROMO_INVALID_REDEMPTION_TRANSITION:${current}:${next}`);
  }
}

export function promotionIdempotencyKey(
  userId:string,
  campaignId:string,
  clientKey:string,
):string{
  return createHash("sha256")
    .update(`${userId}\u0000${campaignId}\u0000${clientKey}`, "utf8")
    .digest("hex");
}
