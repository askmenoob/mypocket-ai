import type {
  FastifyInstance,
  FastifyRequest,
} from "fastify";


import {
  GoogleSettingsService,
} from "./google-settings.service.js";


import {
  GoogleSettingsSchema,
  AutoCreateGoogleSheetSchema,
  ManualGoogleStorageSchema,
  ManualGoogleTemplateInstallSchema,
  ManualGooglePickerListSchema,
} from "./google-settings.schemas.js";



export class GoogleSettingsController {


  private readonly service:
    GoogleSettingsService;



  constructor(
    app:FastifyInstance,
  ){

    this.service =
      new GoogleSettingsService(
        app,
      );

  }





  get = async (
    request:
      FastifyRequest,
  ) => {


    await request.jwtVerify();


    const setting =
      await this.service
        .getSettings(
          request.user.workspaceId,
        );

    if(setting){
      return setting;
    }

    const sharedMembership =
      await request.server.prisma.workspaceMember.findFirst({
        where:{
          userId:
            request.user.userId,

          role:{
            in:[
              "MEMBER",
              "ADMIN",
            ],
          },

          workspace:{
            type:{
              in:[
                "FAMILY",
                "BUSINESS",
              ],
            },
          },
        },

        include:{
          workspace:{
            include:{
              googleSetting:true,
            },
          },
        },

        orderBy:{
          createdAt:
            "desc",
        },
      });

    if(
      sharedMembership
        ?.workspace
        .googleSetting
    ){

      return this.service
        .getSettings(
          sharedMembership
            .workspace
            .id,
        );

    }

    return setting;

  }





  connect = async (
    request:
      FastifyRequest,
  ) => {


    await request.jwtVerify();


    const body =
      GoogleSettingsSchema
        .parse(
          request.body,
        );


    return this.service
      .connectExistingSheet(
        {

          workspaceId:
            request.user.workspaceId,

          spreadsheetId:
            body.spreadsheetId,

          spreadsheetTitle:
            body.spreadsheetTitle,

        },
      );

  }









  listManualPickerItems = async (
    request:
      FastifyRequest,
  ) => {

    await request.jwtVerify();

    const body =
      ManualGooglePickerListSchema
        .parse(
          request.body,
        );

    return this.service
      .listManualPickerItems(
        request.user.workspaceId,
        body,
      );
  };


  validateManual = async (
    request:
      FastifyRequest,
  ) => {

    await request.jwtVerify();

    const body =
      ManualGoogleStorageSchema
        .parse(
          request.body,
        );

    return this.service
      .validateManualStorage(
        request.user.workspaceId,
        body,
      );
  };


  saveManual = async (
    request:
      FastifyRequest,
  ) => {

    await request.jwtVerify();

    const body =
      ManualGoogleStorageSchema
        .parse(
          request.body,
        );

    return this.service
      .saveManualStorage(
        request.user.workspaceId,
        body,
      );
  };


  installManualTemplate = async (
    request:
      FastifyRequest,
  ) => {

    await request.jwtVerify();

    const body =
      ManualGoogleTemplateInstallSchema
        .parse(
          request.body,
        );

    return this.service
      .installManualTemplate(
        request.user.workspaceId,
        body,
      );
  };


  autoCreate = async (
    request:
      FastifyRequest,
  ) => {


    await request.jwtVerify();



    const body =
      AutoCreateGoogleSheetSchema
        .parse(
          request.body,
        );



    return this.service
      .autoCreateSheet(
        request.user.workspaceId,
        body.title,
      );

  };



  updateTemplate = async (
    request:
      FastifyRequest,
  ) => {

    await request.jwtVerify();

    return this.service
      .updateTemplate(
        request.user.workspaceId,
      );

  };


  delete = async (
    request:
      FastifyRequest,
  ) => {


    await request.jwtVerify();


    return this.service
      .disconnect(
        request.user.workspaceId,
      );

  };


}
