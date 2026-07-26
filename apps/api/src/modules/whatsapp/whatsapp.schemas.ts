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



export const whatsappDevInstanceSchema =
z.object({

  instanceName:
    z.string()
      .min(1),

  phoneNumber:
    z.string()
      .optional(),

});



export const whatsappMemberLinkSchema =
z.object({

  email:
    z.string()
      .email(),

  phoneNumber:
    z.string()
      .min(6),

});
