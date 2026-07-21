import type { FastifyPluginAsync } from "fastify";

import googleRoutes from "./google.routes.js";

import googleOauthRoutes from "./oauth/google.oauth.routes.js";

import { appsScriptRoutes } from "./apps-script/apps-script.routes.js";

import googleSettingsRoutes from "./settings/google-settings.routes.js";



const googleModule: FastifyPluginAsync = async (app) => {


  await app.register(
    googleRoutes,
    {
      prefix: "/google",
    },
  );



  await app.register(
    googleOauthRoutes,
    {
      prefix: "/google/oauth",
    },
  );



  await app.register(
    appsScriptRoutes,
    {
      prefix: "/google/apps-script",
    },
  );



  await app.register(
    googleSettingsRoutes,
    {
      prefix: "/google",
    },
  );


};



export default googleModule;
