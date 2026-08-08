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







export interface GoogleDrivePickerItem {

  id:
    string;

  name:
    string;

  mimeType:
    string;

  kind:
    "folder"
    |
    "spreadsheet";

  url:
    string;

  modifiedTime:
    string | null;

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










  async getFileMetadata(
    workspaceId:string,
    fileId:string,
  ){

    const drive =
      await this.getClient(
        workspaceId,
      );

    const response =
      await drive.files
        .get({
          fileId,

          fields:
            "id,name,mimeType,trashed,parents,capabilities(canAddChildren,canEdit)",
        });

    return {
      id:
        response.data.id
        ??
        fileId,

      name:
        response.data.name
        ??
        "",

      mimeType:
        response.data.mimeType
        ??
        "",

      trashed:
        response.data.trashed
        ??
        false,

      parents:
        response.data.parents
        ??
        [],

      capabilities:{
        canAddChildren:
          response.data
            .capabilities
            ?.canAddChildren
          ??
          false,

        canEdit:
          response.data
            .capabilities
            ?.canEdit
          ??
          false,
      },
    };
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











  private escapeDriveQueryValue(
    value:string,
  ):string{

    return value
      .replace(
        /\\/g,
        "\\\\",
      )
      .replace(
        /'/g,
        "\\'",
      );
  }


  async listManualPickerItems(
    workspaceId:string,
    input:{
      kind:
        "folder"
        |
        "spreadsheet";
      query?:string;
    },
  ):Promise<GoogleDrivePickerItem[]>{

    const drive =
      await this.getClient(
        workspaceId,
      );

    const mimeType =
      input.kind === "folder"
        ?
        "application/vnd.google-apps.folder"
        :
        "application/vnd.google-apps.spreadsheet";

    const clauses =
      [
        `mimeType = '${mimeType}'`,
        "trashed = false",
        "'me' in owners",
      ];

    const query =
      input.query
        ?.trim();

    if(query){

      clauses
        .push(
          `name contains '${this.escapeDriveQueryValue(query)}'`,
        );
    }

    const response =
      await drive.files
        .list({
          q:
            clauses
              .join(
                " and ",
              ),

          fields:
            "files(id,name,mimeType,webViewLink,modifiedTime)",

          orderBy:
            "modifiedTime desc",

          pageSize:
            40,

          spaces:
            "drive",
        });

    const files =
      response
        .data
        .files
      ??
      [];

    return files
      .filter(
        (file) =>
          Boolean(
            file.id,
          ),
      )
      .map(
        (file) => {
          const id =
            file.id
            ??
            "";

          return {
            id,

            name:
              file.name
              ??
              "Untitled",

            mimeType:
              file.mimeType
              ??
              mimeType,

            kind:
              input.kind,

            url:
              file.webViewLink
              ??
              (
                input.kind === "folder"
                  ?
                  `https://drive.google.com/drive/folders/${id}`
                  :
                  `https://docs.google.com/spreadsheets/d/${id}/edit`
              ),

            modifiedTime:
              file.modifiedTime
              ??
              null,
          };
        },
      );
  }


  async createWorkspaceFolderStructure(
    workspaceId:string,

    rootFolderName:string =
      "MyPocket AI",
  ):Promise<WorkspaceFolderStructure>{



    const rootFolderId =
      await this.createFolder(

        workspaceId,

        rootFolderName,

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
