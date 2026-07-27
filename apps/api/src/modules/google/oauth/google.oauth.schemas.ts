import {
  z,
} from "zod";



export const googleOAuthCallbackSchema =
z.object({

  code:
    z.string()
      .min(1),


  state:
    z.string()
      .min(1)
      .optional(),

});



export type GoogleOAuthCallbackQuery =
z.infer<
  typeof googleOAuthCallbackSchema
>;
