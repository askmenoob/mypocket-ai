import { z } from "zod";
import { paidBillingPlanSchema } from "./billing.schemas.js";

export const chipBillingIntervalSchema = z.enum([
  "MONTHLY",
  "SIX_MONTHS",
  "YEARLY",
]);

export const chipRenewalMethodSchema = z.enum([
  "AUTOMATIC",
  "MANUAL",
]);

export const chipCheckoutSchema = z.object({
  plan: paidBillingPlanSchema,
  interval: chipBillingIntervalSchema,
  renewalMethod: chipRenewalMethodSchema,
  preferredPaymentMethod: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_]+$/u)
    .optional(),
  requestId: z.string().uuid().optional(),
  promoCode: z.string().trim().min(3).max(32)
    .transform((value) => value.toUpperCase().replace(/\s+/gu, "-"))
    .pipe(z.string().regex(/^[A-Z0-9][A-Z0-9_-]{2,31}$/u))
    .optional(),
}).superRefine((value, context) => {
  if(value.promoCode && !value.requestId){
    context.addIssue({
      code:"custom",
      path:["requestId"],
      message:"A request ID is required when applying a promotion",
    });
  }
});

export const chipPaymentMethodsQuerySchema = z.object({
  plan: paidBillingPlanSchema,
  interval: chipBillingIntervalSchema,
  renewalMethod: chipRenewalMethodSchema,
  promoCode: z.string().trim().min(3).max(32)
    .transform((value) => value.toUpperCase().replace(/\s+/gu, "-"))
    .pipe(z.string().regex(/^[A-Z0-9][A-Z0-9_-]{2,31}$/u))
    .optional(),
});

export type ChipCheckoutInput = z.infer<typeof chipCheckoutSchema>;
export type ChipPaymentMethodsQuery = z.infer<
  typeof chipPaymentMethodsQuerySchema
>;
