export const Roles = {

  OWNER:
    "OWNER",

  ADMIN:
    "ADMIN",

  MEMBER:
    "MEMBER",

  VIEWER:
    "VIEWER",

} as const;



export type Role =
  typeof Roles[keyof typeof Roles];
