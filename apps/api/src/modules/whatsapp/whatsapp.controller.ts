import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";


import {
  env,
} from "../../config/env.js";


import {
  AppError,
} from "../../shared/errors/index.js";


import {
  WhatsAppService,
} from "./whatsapp.service.js";


import {
  whatsappDevInstanceSchema,
  whatsappDevTransactionSchema,
} from "./whatsapp.schemas.js";



export class WhatsAppController {


  private readonly service:
    WhatsAppService;



  constructor(
    app:FastifyInstance,
  ){

    this.service =
      new WhatsAppService(
        app,
      );

  }





  registerDevInstance =
  async (
    request:FastifyRequest,
    reply:FastifyReply,
  ) => {

    await request.jwtVerify();


    const user =
      request.user as any;


    const body =
      whatsappDevInstanceSchema
        .parse(
          request.body,
        );


    const result =
      await this.service
        .registerDevInstance({
          workspaceId:
            user.workspaceId,

          instanceName:
            body.instanceName,

          phoneNumber:
            body.phoneNumber,
        });


    return reply
      .code(201)
      .send(
        result,
      );

  };





  createDevTransaction =
  async (
    request:FastifyRequest,
    reply:FastifyReply,
  ) => {

    await request.jwtVerify();


    const user =
      request.user as any;


    const body =
      whatsappDevTransactionSchema
        .parse(
          request.body,
        );


    const result =
      await this.service
        .createDevTransaction({
          text:
            body.text,

          transactionDate:
            body.transactionDate,

          currency:
            body.currency,

          user:{
            userId:
              user.userId,

            workspaceId:
              user.workspaceId,

            role:
              user.role,
          },
        });


    return reply
      .code(201)
      .send(
        result,
      );

  };





  receiveEvolutionWebhook =
  async (
    request:FastifyRequest,
    reply:FastifyReply,
  ) => {

    this.assertWebhookSecret(
      request.headers,
    );


    const result =
      await this.service
        .handleEvolutionWebhook(
          request.body,
        );


    const statusCode =
      result.message ===
      "WhatsApp webhook transaction recorded"
        ?
        201
        :
        200;


    return reply
      .code(
        statusCode,
      )
      .send(
        result,
      );

  };





  private assertWebhookSecret(
    headers:FastifyRequest["headers"],
  ){

    if(
      !env.WHATSAPP_WEBHOOK_SECRET
    ){

      throw new AppError(
        "WHATSAPP_WEBHOOK_SECRET_MISSING",
        "WhatsApp webhook secret is not configured",
        500,
      );

    }


    const secret =
      this.headerValue(
        headers["x-mypocket-webhook-secret"]
        ??
        headers["x-evolution-secret"],
      );


    const bearer =
      this.headerValue(
        headers.authorization,
      )
        .replace(
          /^Bearer\s+/i,
          "",
        );


    if(
      secret !== env.WHATSAPP_WEBHOOK_SECRET
      &&
      bearer !== env.WHATSAPP_WEBHOOK_SECRET
    ){

      throw new AppError(
        "WHATSAPP_WEBHOOK_UNAUTHORIZED",
        "Invalid WhatsApp webhook secret",
        401,
      );

    }

  }





  private headerValue(
    value:unknown,
  ){

    if(
      Array.isArray(
        value,
      )
    ){

      return value[0]
        ??
        "";

    }


    return typeof value === "string"
      ?
      value
      :
      "";

  }

}
