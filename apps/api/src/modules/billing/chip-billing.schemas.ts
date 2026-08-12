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
});

export const chipPaymentMethodsQuerySchema = z.object({
  plan: paidBillingPlanSchema,
  interval: chipBillingIntervalSchema,
  renewalMethod: chipRenewalMethodSchema,
});

export type ChipCheckoutInput = z.infer<typeof chipCheckoutSchema>;
export type ChipPaymentMethodsQuery = z.infer<
  typeof chipPaymentMethodsQuerySchema
>;
