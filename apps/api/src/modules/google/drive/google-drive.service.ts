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



export interface WorkspaceFolderStructure {

  rootFolderId:
    string;


  reportsFolderId:
    string;


  receiptsFolderId:
    string;


  exportsFolderId:
    string;

}





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









  async createFolder(
    workspaceId:string,

    name:string,

    parentId?:string,

  ):Promise<string>{


    const drive =
      await this.getClient(
        workspaceId,
      );



    const response =
      await drive.files.create({

        requestBody:{

          name,

          mimeType:
            "application/vnd.google-apps.folder",


          parents:
            parentId
              ?
              [parentId]
              :
              undefined,

        },


        fields:
          "id",

      });



    return response.data.id
      ??
      "";

  }









  async copyFile(
    workspaceId:string,

    fileId:string,

    name?:string,

    parentId?:string,

  ){


    const drive =
      await this.getClient(
        workspaceId,
      );



    const response =
      await drive.files.copy({

        fileId,


        requestBody:{


          name,


          parents:
            parentId
              ?
              [parentId]
              :
              undefined,


        },


        fields:
          "id,name,webViewLink",

      });



    return {

      id:
        response.data.id
        ??
        "",


      name:
        response.data.name
        ??
        "",


      url:
        response.data.webViewLink
        ??
        "",

    };

  }









  async createWorkspaceFolderStructure(
    workspaceId:string,
  ):Promise<WorkspaceFolderStructure>{



    const rootFolderId =
      await this.createFolder(

        workspaceId,

        "MyPocket AI",

      );



    const reportsFolderId =
      await this.createFolder(

        workspaceId,

        "Reports",

        rootFolderId,

      );



    const receiptsFolderId =
      await this.createFolder(

        workspaceId,

        "Receipts",

        rootFolderId,

      );



    const exportsFolderId =
      await this.createFolder(

        workspaceId,

        "Exports",

        rootFolderId,

      );



    return {

      rootFolderId,

      reportsFolderId,

      receiptsFolderId,

      exportsFolderId,

    };

  }









  async moveFileToReportsFolder(
    workspaceId:string,

    fileId:string,


    reportsFolderId:string,

  ):Promise<void>{


    const drive =
      await this.getClient(
        workspaceId,
      );



    await drive.files.update({

      fileId,


      addParents:
        reportsFolderId,


      fields:
        "id,parents",

    });

  }




}
