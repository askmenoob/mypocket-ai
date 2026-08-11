import { env } from "../../config/index.js";
import {
  googleConfig,
} from "../../config/google.js";
import type { GoogleProfile } from "./auth.types.js";
import {
  buildGoogleAuthorizationUrl,
  buildGoogleTokenRequestBody,
} from "../../shared/google/google-oauth-request.js";


interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}


export class GoogleService {


  private getAuthRedirectUri() {

    if (env.GOOGLE_AUTH_REDIRECT_URI) {

      return env.GOOGLE_AUTH_REDIRECT_URI;

    }


    const redirectUri =
      env.GOOGLE_REDIRECT_URI
      ?? "";


    if (
      redirectUri.includes(
        "/google/oauth/",
      )
    ) {

      return redirectUri.replace(
        /\/google\/oauth\/.*$/,
        "/auth/google/callback",
      );

    }


    return redirectUri;

  }


  getAuthorizationUrl(
    state:string,
    codeChallenge:string,
  ) {

    const redirectUri =
      this.getAuthRedirectUri();

    return buildGoogleAuthorizationUrl({
      clientId:
        env.GOOGLE_CLIENT_ID ?? "",
      redirectUri,
      scopes:
        googleConfig.identityScopes,
      accessType:
        "online",
      state,
      codeChallenge,
    });
  }



  async exchangeCode(
    code: string,
    codeVerifier:string,
  ): Promise<GoogleTokenResponse> {


    const response =
      await fetch(
        "https://oauth2.googleapis.com/token",
        {

          method:
            "POST",

          headers:
          {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },


          body:
            buildGoogleTokenRequestBody({
              clientId:
                env.GOOGLE_CLIENT_ID ?? "",
              clientSecret:
                env.GOOGLE_CLIENT_SECRET ?? "",
              code,
              codeVerifier,
              redirectUri:
                this.getAuthRedirectUri(),
            }),
        },
      );


    if (!response.ok) {

      throw new Error(
        "GOOGLE_TOKEN_EXCHANGE_FAILED",
      );

    }


    return response.json();

  }




  async getProfile(
    accessToken: string,
  ): Promise<GoogleProfile> {


    const response =
      await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {

          headers:
          {
            Authorization:
              `Bearer ${accessToken}`,
          },

        },
      );


    if (!response.ok) {

      throw new Error(
        "GOOGLE_PROFILE_FETCH_FAILED",
      );

    }


    const data =
      await response.json() as {
        email: string;
        name: string;
        picture?: string;
      };


    return {

      email:
        data.email,

      name:
        data.name,

      picture:
        data.picture,

    };

  }

}
