import {
  env,
} from "./index.js";


export const googleConfig = {

  clientId:
    env.GOOGLE_CLIENT_ID,


  clientSecret:
    env.GOOGLE_CLIENT_SECRET,


  redirectUri:
    env.GOOGLE_REDIRECT_URI,


  reportsFolderId:
    env.GOOGLE_REPORTS_FOLDER_ID,


  templateRootFolderId:
    env.GOOGLE_TEMPLATE_ROOT_FOLDER_ID,


  scopes:[
    "openid",

    "https://www.googleapis.com/auth/userinfo.email",

    "https://www.googleapis.com/auth/userinfo.profile",

    "https://www.googleapis.com/auth/spreadsheets",

    "https://www.googleapis.com/auth/drive",
  ],


};
