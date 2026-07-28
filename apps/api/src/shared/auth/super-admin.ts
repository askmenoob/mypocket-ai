export const SUPER_ADMIN_EMAIL =
  "pillo0404@gmail.com";


export function isSuperAdminEmail(
  email?:string | null,
){

  return (
    email
      ?.trim()
      .toLowerCase()
    ===
    SUPER_ADMIN_EMAIL
  );

}
