import {
  env,
} from "./index.js";
import {
  GOOGLE_IDENTITY_SCOPES,
  GOOGLE_WORKSPACE_SCOPES,
} from "./google-scopes.js";


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


  identityScopes:
    GOOGLE_IDENTITY_SCOPES,


  workspaceScopes:
    GOOGLE_WORKSPACE_SCOPES,


};
