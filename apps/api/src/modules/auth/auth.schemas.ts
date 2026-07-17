import { z } from "zod";

export const GoogleProfileSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  picture: z.string().optional(),
});

export const AuthSessionSchema = z.object({
  token: z.string(),

  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().nullable().optional(),
  }),

  workspace: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export type AuthSessionResponse = z.infer<
  typeof AuthSessionSchema
>;
