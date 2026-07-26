import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";


import {
  WhatsAppService,
} from "./whatsapp.service.js";


import {
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

}
