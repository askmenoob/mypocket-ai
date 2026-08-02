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

    return sharedMembership?.workspace.googleSetting
      ?? setting;

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
