import {
  z,
} from "zod";



export const GoogleSettingsSchema =
z.object({

  spreadsheetId:
    z.string()
      .min(1),


  spreadsheetTitle:
    z.string()
      .optional(),

});


export const AutoCreateGoogleSheetSchema =
z.object({

  title:
    z.string()
      .min(1),

});





export const ManualGooglePickerListSchema =
z.object({

  kind:
    z.enum([
      "folder",
      "spreadsheet",
    ]),

  query:
    z.string()
      .trim()
      .max(120)
      .optional(),

})
  .strict();

export const ManualGoogleStorageSchema =
z.object({

  rootFolderUrl:
    z.string()
      .url()
      .min(1),

  spreadsheetUrl:
    z.string()
      .url()
      .min(1),

  backupSpreadsheetUrl:
    z.string()
      .url()
      .min(1)
      .optional(),

})
  .strict();


export const ManualGoogleTemplateInstallSchema =
z.object({

  spreadsheetUrl:
    z.string()
      .url()
      .min(1),

})
  .strict();
