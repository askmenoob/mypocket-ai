import {
  Roles,
} from "./roles.js";


export const Permissions = {

  WORKSPACE_READ:
    "workspace.read",

  WORKSPACE_SETTINGS:
    "workspace.settings",

  MEMBER_READ:
    "member.read",

  MEMBER_UPDATE:
    "member.update",

  MEMBER_DELETE:
    "member.delete",

} as const;



export type Permission =
  typeof Permissions[keyof typeof Permissions];



export const RolePermissions = {

  [Roles.OWNER]: [

    Permissions.WORKSPACE_READ,

    Permissions.WORKSPACE_SETTINGS,

    Permissions.MEMBER_READ,

    Permissions.MEMBER_UPDATE,

    Permissions.MEMBER_DELETE,

  ],


  [Roles.ADMIN]: [

    Permissions.WORKSPACE_READ,

    Permissions.MEMBER_READ,

    Permissions.MEMBER_UPDATE,

    Permissions.MEMBER_DELETE,

  ],


  [Roles.MEMBER]: [

    Permissions.WORKSPACE_READ,

    Permissions.MEMBER_READ,

  ],


  [Roles.VIEWER]: [

    Permissions.WORKSPACE_READ,

  ],

};
