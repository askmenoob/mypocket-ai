import { z } from "zod";

export const UpdateBillingAnnualDiscountSchema = z.object({
  annualDiscountPercent: z.coerce
    .number()
    .min(0)
    .max(100)
    .refine(
      (value) => Number.isInteger(value * 100),
      "Annual discount supports at most two decimal places",
    ),
  expectedVersion: z.coerce.number().int().min(1),
});

export type UpdateBillingAnnualDiscountInput = z.infer<
  typeof UpdateBillingAnnualDiscountSchema
>;
