export type MyPocketRootFolderPlan =
  | "PERSONAL"
  | "PERSONAL_PRO"
  | "FAMILY"
  | "BUSINESS";


const PLAN_FOLDER_LABEL:
Record<
  MyPocketRootFolderPlan,
  string
> = {
  PERSONAL:
    "Personal Basic",
  PERSONAL_PRO:
    "Personal Pro",
  FAMILY:
    "Family",
  BUSINESS:
    "Business",
};


export function buildMyPocketRootFolderName(
  plan:MyPocketRootFolderPlan,
  ownerEmail?:string | null,
):string{
  const normalizedEmail =
    ownerEmail
      ?.trim()
      .toLowerCase()
      .replace(
        /\s+/g,
        "",
      );

  const baseName =
    `MyPocket AI ${PLAN_FOLDER_LABEL[plan]}`;

  return normalizedEmail
    ? `${baseName} (${normalizedEmail})`
    : baseName;
}
