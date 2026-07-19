import {
  z,
} from "zod";



export const connectGoogleSchema =
z.object({

  email:
    z.string()
      .email(),


  accessToken:
    z.string()
      .min(1),


  refreshToken:
    z.string()
      .optional(),


  expiresAt:
    z.string()
      .datetime()
      .optional(),


  scopes:
    z.string()
      .optional(),

});



export type ConnectGoogleBody =
z.infer<
  typeof connectGoogleSchema
>;
