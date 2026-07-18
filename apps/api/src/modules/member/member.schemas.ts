import { z } from "zod";


export const MemberRoleSchema =
  z.enum([
    "OWNER",
    "ADMIN",
    "MEMBER",
    "VIEWER",
  ]);


export const WorkspaceMemberResponseSchema =
  z.object({

    id:
      z.string(),

    user:
      z.object({

        id:
          z.string(),

        email:
          z.string(),

        name:
          z.string().nullable(),

      }),

    role:
      MemberRoleSchema,

  });


export type WorkspaceMemberResponse =
  z.infer<
    typeof WorkspaceMemberResponseSchema
  >;
