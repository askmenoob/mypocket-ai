import { z } from "zod";


export const WorkspaceTypeSchema =
  z.enum([
    "PERSONAL",
    "FAMILY",
    "BUSINESS",
  ]);


export const WorkspacePackageSchema =
  z.enum([
    "PERSONAL",
    "PERSONAL_PRO",
    "FAMILY",
    "BUSINESS",
  ]);


export const WorkspaceRoleSchema =
  z.enum([
    "OWNER",
    "ADMIN",
    "MEMBER",
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




export const UpdateWorkspaceNameSchema =
  z.object({

    name:
      z.string()
        .trim()
        .min(
          3,
          "Workspace name must contain at least 3 characters",
        )
        .max(
          80,
          "Workspace name cannot exceed 80 characters",
        )
        .regex(
          /^[^\r\n\t]+$/u,
          "Workspace name contains invalid characters",
        ),

  });



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



export const UpdateUserPackageSchema =
  z.object({

    package:
      WorkspacePackageSchema,

  });


export type UpdateUserPackageInput =
  z.infer<
    typeof UpdateUserPackageSchema
  >;

