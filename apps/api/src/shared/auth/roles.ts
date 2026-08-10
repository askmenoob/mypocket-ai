export const Roles = {

  OWNER:
    "OWNER",

  ADMIN:
    "ADMIN",

  MEMBER:
    "MEMBER",


} as const;



export type Role =
  typeof Roles[keyof typeof Roles];
