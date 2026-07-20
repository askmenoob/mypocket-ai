import { z } from "zod";


export const WorkspaceTypeSchema =
  z.enum([
    "PERSONAL",
    "FAMILY",
    "BUSINESS",
  ]);


export const WorkspaceRoleSchema =
  z.enum([
    "OWNER",
    "ADMIN",
    "MEMBER",
    "VIEWER",
  ]);


export const WorkspaceResponseSchema =
  z.object({

    id:
      z.string(),

    name:
      z.string(),

    type:
      WorkspaceTypeSchema,

    role:
      WorkspaceRoleSchema,

  });


export type WorkspaceResponse =
  z.infer<
    typeof WorkspaceResponseSchema
  >;




export const CreateWorkspaceSchema =
  z.object({

    name:
      z.string()
      .min(3),

    type:
      WorkspaceTypeSchema,

  });



export type CreateWorkspaceInput =
  z.infer<
    typeof CreateWorkspaceSchema
  >;

