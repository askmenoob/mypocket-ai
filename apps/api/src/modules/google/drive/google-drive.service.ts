import type {
  FastifyInstance,
} from "fastify";


import {
  google,
} from "googleapis";


import {
  GoogleTokenService,
} from "../token/google-token.service.js";


import {
  googleConfig,
} from "../../../config/google.js";



export class GoogleDriveService {


  private readonly tokenService:
    GoogleTokenService;



  constructor(
    app:FastifyInstance,
  ){

    this.tokenService =
      new GoogleTokenService(
        app,
      );

  }





  private async getClient(
    workspaceId:string,
  ){

    const accessToken =
      await this.tokenService
        .getValidAccessToken(
          workspaceId,
        );


    const auth =
      new google.auth.OAuth2();


    auth.setCredentials({

      access_token:
        accessToken,

    });



    return google.drive({

      version:
        "v3",

      auth,

    });

  }





  async moveFileToReportsFolder(
    workspaceId:string,
    fileId:string,
  ):Promise<void>{


    const drive =
      await this.getClient(
        workspaceId,
      );


    await drive.files.update({

      fileId,


      addParents:
        googleConfig.reportsFolderId,


      fields:
        "id,parents",

    });

  }


}
