export type MemberRole =
  | "OWNER"
  | "ADMIN"
  | "MEMBER";


export interface WorkspaceMemberContext {

  id: string;

  userId: string;

  workspaceId: string;

  role: MemberRole;

}
