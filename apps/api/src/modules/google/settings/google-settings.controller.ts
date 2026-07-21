import type {
  FastifyInstance,
  FastifyRequest,
} from "fastify";


import {
  GoogleSettingsService,
} from "./google-settings.service.js";


import {
  GoogleSettingsSchema,
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


    return this.service
      .getSettings(
        request.user.workspaceId,
      );

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
