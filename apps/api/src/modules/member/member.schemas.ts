import { z } from "zod";


export const MemberRoleSchema =
  z.enum([
    "OWNER",
    "ADMIN",
    "MEMBER",
  ]);



export const CreateMemberSchema =
  z.object({

    email:
      z.string()
        .email(),


    role:
      MemberRoleSchema
        .default("MEMBER"),

  });



export type CreateMemberInput =
  z.infer<
    typeof CreateMemberSchema
  >;



export const UpdateMemberRoleSchema =
  z.object({

    role:
      MemberRoleSchema,

  });



export type UpdateMemberRoleInput =
  z.infer<
    typeof UpdateMemberRoleSchema
  >;



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
