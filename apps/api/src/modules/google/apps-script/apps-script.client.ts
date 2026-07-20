import { env } from "../../../config/env.js";


import type {
  AppsScriptRequest,
  AppsScriptResponse
}
from "./apps-script.types.js";



export class AppsScriptClient {



  async post<T = unknown>(
    payload: AppsScriptRequest
  ): Promise<AppsScriptResponse<T>> {



    if(
      !env.GOOGLE_APPS_SCRIPT_URL
    ){

      throw new Error(
        "GOOGLE_APPS_SCRIPT_URL missing"
      );

    }



    if(
      !env.MYPOCKET_APPS_SCRIPT_API_KEY
    ){

      throw new Error(
        "MYPOCKET_APPS_SCRIPT_API_KEY missing"
      );

    }



    const requestPayload = {

      ...payload,

      apiKey:
        env.MYPOCKET_APPS_SCRIPT_API_KEY

    };


    const response =

      await fetch(

        env.GOOGLE_APPS_SCRIPT_URL,

        {

          method: "POST",


          headers: {

            "Content-Type":
              "application/json",


            "X-MyPocket-Key":
              env.MYPOCKET_APPS_SCRIPT_API_KEY

          },


          body:

            JSON.stringify(
              requestPayload
            )


        }

      );





    const data =

      await response.json();





    return (

      data as AppsScriptResponse<T>

    );



  }


}
