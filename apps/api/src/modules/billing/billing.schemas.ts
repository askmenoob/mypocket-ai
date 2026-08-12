import {
  z,
} from "zod";


export const paidBillingPlanSchema =
  z.enum([
    "PERSONAL_PRO",
    "FAMILY",
    "BUSINESS",
  ]);


export type PaidBillingPlan =
  z.infer<
    typeof paidBillingPlanSchema
  >;
