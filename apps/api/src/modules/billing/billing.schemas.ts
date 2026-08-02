import {
  z,
} from "zod";


export const paidBillingPlanSchema =
  z.enum([
    "PERSONAL_PRO",
    "FAMILY",
    "BUSINESS",
  ]);


export const createHitPayCheckoutSchema =
  z.object({
    plan:
      paidBillingPlanSchema,
  });


export const changeHitPayPlanSchema =
  z.object({
    plan:
      paidBillingPlanSchema,
  });


export type PaidBillingPlan =
  z.infer<
    typeof paidBillingPlanSchema
  >;


export type CreateHitPayCheckoutInput =
  z.infer<
    typeof createHitPayCheckoutSchema
  >;


export type ChangeHitPayPlanInput =
  z.infer<
    typeof changeHitPayPlanSchema
  >;
