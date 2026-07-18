import { z } from "zod";


export const createTransactionSchema =
z.object({

  amount:
    z.string(),

  currency:
    z.string()
      .optional(),

  type:
    z.enum([
      "EXPENSE",
      "INCOME",
    ]),

  description:
    z.string()
      .optional(),

  transactionDate:
    z.string()
      .datetime(),

  categoryId:
    z.string()
      .optional(),

  merchantId:
    z.string()
      .optional(),

  paymentMethodId:
    z.string()
      .optional(),

  receiptUrl:
    z.string()
      .optional(),

});



export const updateTransactionSchema =
createTransactionSchema
.partial();


export type CreateTransactionBody =
z.infer<
 typeof createTransactionSchema
>;


export type UpdateTransactionBody =
z.infer<
 typeof updateTransactionSchema
>;
