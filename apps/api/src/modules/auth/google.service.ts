import { env } from "../../config/index.js";
import {
  googleConfig,
} from "../../config/google.js";
import type { GoogleProfile } from "./auth.types.js";


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


  getAuthorizationUrl() {

    const redirectUri =
      this.getAuthRedirectUri();

    const params = new URLSearchParams({

      client_id:
        env.GOOGLE_CLIENT_ID ?? "",

      redirect_uri:
        redirectUri,

      response_type:
        "code",

      scope:
        [
          "openid",
          "email",
          "profile",
        ].join(" "),

      access_type:
        "online",
    });


    return (
      "https://accounts.google.com/o/oauth2/v2/auth?"
      +
      params.toString()
    );
  }



  async exchangeCode(
    code: string,
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
            new URLSearchParams({

              client_id:
                env.GOOGLE_CLIENT_ID ?? "",

              client_secret:
                env.GOOGLE_CLIENT_SECRET ?? "",

              code,

              grant_type:
                "authorization_code",

              redirect_uri:
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
