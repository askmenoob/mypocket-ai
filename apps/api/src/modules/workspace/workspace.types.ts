export type WorkspaceType =
  | "PERSONAL"
  | "FAMILY"
  | "BUSINESS";


export type WorkspaceRole =
  | "OWNER"
  | "ADMIN"
  | "MEMBER"
  | "VIEWER";


export interface WorkspaceContext {
  id: string;
  name: string;
  type: WorkspaceType;
  role: WorkspaceRole;
}
