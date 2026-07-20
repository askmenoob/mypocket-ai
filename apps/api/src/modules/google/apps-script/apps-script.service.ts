import {
  AppsScriptClient
}
from "./apps-script.client.js";


import type {
  AppsScriptRequest
}
from "./apps-script.types.js";



export class AppsScriptService {


  private client =
    new AppsScriptClient();





  async execute(
    request: AppsScriptRequest
  ){


    return this.client.post(
      request
    );


  }







  async addTransaction(
    workspace:
      | "PERSONAL"
      | "FAMILY"
      | "BUSINESS",

    data: unknown

  ){



    return this.execute({



      workspace,



      action:

        "ADD_TRANSACTION",



      data



    });



  }



}
