export interface GoogleProfile {
  email: string;
  name: string;
  picture?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  workspaceId: string;
}

export interface AuthSession {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
  workspace: {
    id: string;
    name: string;
    role:
      | "OWNER"
      | "ADMIN"
      | "MEMBER"
      | "VIEWER";
  };
}
