export const GOOGLE_IDENTITY_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
] as const;


export const GOOGLE_WORKSPACE_SCOPES = [
  ...GOOGLE_IDENTITY_SCOPES,
  "https://www.googleapis.com/auth/drive.file",
] as const;
