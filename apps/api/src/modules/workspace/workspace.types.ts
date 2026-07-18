export type WorkspaceRole =
  | "OWNER"
  | "ADMIN"
  | "MEMBER"
  | "VIEWER";


export interface WorkspaceContext {
  id: string;
  name: string;
  role: WorkspaceRole;
}
