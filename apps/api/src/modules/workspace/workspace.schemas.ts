import { z } from "zod";


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

    role:
      WorkspaceRoleSchema,

  });


export type WorkspaceResponse =
  z.infer<
    typeof WorkspaceResponseSchema
  >;
