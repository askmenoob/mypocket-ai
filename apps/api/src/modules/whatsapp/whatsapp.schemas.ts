import {
  z,
} from "zod";



export const whatsappDevTransactionSchema =
z.object({

  text:
    z.string()
      .min(1),

  transactionDate:
    z.string()
      .datetime()
      .optional(),

  currency:
    z.string()
      .min(3)
      .max(3)
      .optional(),

});
