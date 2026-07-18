export type MemberRole =
  | "OWNER"
  | "ADMIN"
  | "MEMBER"
  | "VIEWER";


export interface WorkspaceMemberContext {

  id: string;

  userId: string;

  workspaceId: string;

  role: MemberRole;

}
