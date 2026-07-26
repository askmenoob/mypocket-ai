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





  showDevQr =
  async (
    request:FastifyRequest,
    reply:FastifyReply,
  ) => {

    const query =
      request.query as {
        instanceName?:string;
        secret?:string;
      };


    if(
      !env.WHATSAPP_WEBHOOK_SECRET
    ){

      throw new AppError(
        "WHATSAPP_WEBHOOK_SECRET_MISSING",
        "WhatsApp webhook secret is not configured",
        500,
      );

    }


    if(
      query.secret !== env.WHATSAPP_WEBHOOK_SECRET
    ){

      throw new AppError(
        "WHATSAPP_QR_UNAUTHORIZED",
        "Invalid WhatsApp QR secret",
        401,
      );

    }


    const instanceName =
      query.instanceName
      ??
      "imai-dev";


    const base64 =
      await this.service
        .getEvolutionQrBase64(
          instanceName,
        );


    return reply
      .type(
        "text/html",
      )
      .send(
        `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>MyPocket WhatsApp QR</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #0f172a;
      color: #e5e7eb;
      min-height: 100vh;
      display: grid;
      place-items: center;
      margin: 0;
    }
    main {
      background: #111827;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 28px;
      text-align: center;
      max-width: 520px;
      box-shadow: 0 20px 80px rgba(0,0,0,.35);
    }
    img {
      width: min(360px, 80vw);
      height: auto;
      background: white;
      padding: 16px;
      border-radius: 16px;
    }
    p {
      color: #94a3b8;
      line-height: 1.5;
    }
    code {
      color: #93c5fd;
    }
  </style>
</head>
<body>
  <main>
    <h1>MyPocket WhatsApp QR</h1>
    <p>Instance: <code>${this.escapeHtml(instanceName)}</code></p>
    <img src="${base64}" alt="WhatsApp QR Code" />
    <p>WhatsApp → Linked devices → Link a device → scan QR ini.</p>
  </main>
</body>
</html>`,
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





  private escapeHtml(
    value:string,
  ){

    return value
      .replaceAll(
        "&",
        "&amp;",
      )
      .replaceAll(
        "<",
        "&lt;",
      )
      .replaceAll(
        ">",
        "&gt;",
      )
      .replaceAll(
        '"',
        "&quot;",
      )
      .replaceAll(
        "'",
        "&#039;",
      );

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
