export type WorkspaceType =
  | "PERSONAL"
  | "FAMILY"
  | "BUSINESS";


export type WorkspacePackage =
  | WorkspaceType
  | "PERSONAL_PRO";


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
