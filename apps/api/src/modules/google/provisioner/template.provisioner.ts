import type {
  FastifyInstance,
} from "fastify";


import {
  GoogleTemplateService,
} from "../templates/google-template.service.js";


import {
  GoogleDriveService,
} from "../drive/google-drive.service.js";


import type {
  TemplateProvisionInput,
  TemplateProvisionResult,
} from "./template.types.js";



export class TemplateProvisioner {


  private readonly templateService:
    GoogleTemplateService;


  private readonly driveService:
    GoogleDriveService;



  constructor(
    app:FastifyInstance,
  ){

    this.templateService =
      new GoogleTemplateService(
        app,
      );


    this.driveService =
      new GoogleDriveService(
        app,
      );

  }





  async provision(
    input:
      TemplateProvisionInput,
  ):Promise<TemplateProvisionResult>{



    const template =
      await this.templateService
        .getTemplate(
          input.workspaceType,
        );



    const folders =
      await this.driveService
        .createWorkspaceFolderStructure(
          input.workspaceId,
        );



    const copied =
      await this.driveService
        .copyFile(

          input.workspaceId,

          template.spreadsheetId,

          template.name,

          folders.reportsFolderId,

        );



    return {

      spreadsheetId:
        copied.id,


      spreadsheetTitle:
        copied.name,


      spreadsheetUrl:
        copied.url,


      rootFolderId:
        folders.rootFolderId,


      reportsFolderId:
        folders.reportsFolderId,


      receiptsFolderId:
        folders.receiptsFolderId,


      exportsFolderId:
        folders.exportsFolderId,

    };


  }


}
