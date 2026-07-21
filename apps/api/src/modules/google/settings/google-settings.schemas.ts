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
