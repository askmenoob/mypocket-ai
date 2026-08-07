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



export const bulkDeleteTransactionsSchema =
z.object({

  transactionIds:
    z.array(
      z.string()
        .trim()
        .min(
          1,
        ),
    )
      .min(
        1,
      )
      .max(
        100,
      ),

});


export type BulkDeleteTransactionsBody =
z.infer<
 typeof bulkDeleteTransactionsSchema
>;



export type CreateTransactionBody =
z.infer<
 typeof createTransactionSchema
>;


export type UpdateTransactionBody =
z.infer<
 typeof updateTransactionSchema
>;
