import {
  execFile,
} from "node:child_process";

import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";

import {
  tmpdir,
} from "node:os";

import {
  join,
} from "node:path";

import {
  env,
} from "../../config/index.js";

import {
  AppError,
} from "../../shared/errors/app-error.js";


type HitPayRequestInput = {

  method:
    "GET"
    |
    "POST"
    |
    "PUT"
    |
    "DELETE";

  path:
    string;

  body?:
    unknown;

};


export type HitPayResponse = {

  status:
    number;

  payload:
    unknown;

};


function executeCurl(
  argumentsList:string[],
){

  return new Promise<string>(
    (
      resolve,
      reject,
    ) => {

      execFile(
        "/usr/bin/curl",
        argumentsList,
        {
          encoding:
            "utf8",

          maxBuffer:
            2 * 1024 * 1024,

          timeout:
            35000,

          killSignal:
            "SIGTERM",
        },
        (
          error,
          stdout,
          stderr,
        ) => {

          if(error){

            reject(
              Object.assign(
                error,
                {
                  stderr,
                },
              ),
            );

            return;

          }


          resolve(
            stdout,
          );

        },
      );

    },
  );

}


export class HitPayClient {


  async request(
    input:HitPayRequestInput,
  ):Promise<HitPayResponse>{

    if(
      !input.path.startsWith(
        "/",
      )
    ){

      throw new AppError(
        "HITPAY_PATH_INVALID",
        "Invalid HitPay API path",
        500,
      );

    }


    const directory =
      await mkdtemp(
        join(
          tmpdir(),
          "imai-hitpay-",
        ),
      );


    const headersFile =
      join(
        directory,
        "headers.txt",
      );


    const requestFile =
      join(
        directory,
        "request.json",
      );


    const responseFile =
      join(
        directory,
        "response.json",
      );


    try{

      await writeFile(
        headersFile,
        [
          (
            "X-BUSINESS-API-KEY: "
            +
            env.HITPAY_API_KEY
          ),

          "X-Requested-With: XMLHttpRequest",
          "Accept: application/json",
          "Content-Type: application/json",
          "",
        ].join(
          "\n",
        ),
        {
          mode:
            0o600,
        },
      );


      const argumentsList = [
        "--ipv4",
        "--silent",
        "--show-error",
        "--max-time",
        "30",
        "--output",
        responseFile,
        "--write-out",
        "%{http_code}",
        "--request",
        input.method,
        "--header",
        `@${headersFile}`,
      ];


      if(
        input.body !== undefined
      ){

        await writeFile(
          requestFile,
          JSON.stringify(
            input.body,
          ),
          {
            mode:
              0o600,
          },
        );


        argumentsList.push(
          "--data-binary",
          `@${requestFile}`,
        );

      }


      argumentsList.push(
        (
          env.HITPAY_API_BASE_URL
            .replace(
              /\/+$/,
              "",
            )
          +
          input.path
        ),
      );


      let statusOutput =
        "";


      try{

        statusOutput =
          await executeCurl(
            argumentsList,
          );

      }catch{

        throw new AppError(
          "HITPAY_NETWORK_ERROR",
          "Unable to communicate with HitPay",
          502,
        );

      }


      const status =
        Number(
          statusOutput.trim(),
        );


      if(
        !Number.isInteger(
          status,
        )
        ||
        status < 100
        ||
        status > 599
      ){

        throw new AppError(
          "HITPAY_STATUS_INVALID",
          "HitPay returned an invalid status",
          502,
        );

      }


      const responseText =
        await readFile(
          responseFile,
          "utf8",
        ).catch(
          () => "",
        );


      let payload:unknown =
        {};


      if(
        responseText.trim()
      ){

        try{

          payload =
            JSON.parse(
              responseText,
            );

        }catch{

          payload = {
            raw:
              responseText.slice(
                0,
                1000,
              ),
          };

        }

      }


      return {
        status,
        payload,
      };

    }finally{

      await rm(
        directory,
        {
          recursive:
            true,

          force:
            true,
        },
      );

    }

  }


}
