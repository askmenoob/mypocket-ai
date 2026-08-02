import type {
  FastifyReply,
  FastifyRequest,
} from "fastify";

import {
  AppError,
} from "../../shared/errors/app-error.js";

import {
  changeHitPayPlanSchema,
  createHitPayCheckoutSchema,
} from "./billing.schemas.js";

import type {
  BillingService,
} from "./billing.service.js";


type SessionUser = {

  userId:string;
  workspaceId:string;

};


type RawBodyRequest =
  FastifyRequest
  &
  {
    rawBody:
      Buffer
      |
      null;
  };


export class BillingController {


  constructor(
    private readonly service:
      BillingService,
  ){}


  getSubscription =
  async (
    request:FastifyRequest,
    reply:FastifyReply,
  ) => {

    const actor =
      request.user as unknown as
        SessionUser;


    const result =
      await this.service
        .getSubscription({
          userId:
            actor.userId,

          workspaceId:
            actor.workspaceId,
        });


    return reply.send(
      result,
    );

  };


  createCheckout =
  async (
    request:FastifyRequest,
    reply:FastifyReply,
  ) => {

    const actor =
      request.user as unknown as
        SessionUser;


    const checkout =
      createHitPayCheckoutSchema
        .parse(
          request.body,
        );


    const result =
      await this.service
        .createCheckout({
          userId:
            actor.userId,

          workspaceId:
            actor.workspaceId,

          checkout,
        });


    return reply
      .code(
        result.reused
          ? 200
          : 201,
      )
      .send(
        result,
      );

  };


  changePlan =
  async (
    request:FastifyRequest,
    reply:FastifyReply,
  ) => {

    const actor =
      request.user as unknown as
        SessionUser;


    const change =
      changeHitPayPlanSchema
        .parse(
          request.body,
        );


    const result =
      await this.service
        .changePlan({
          userId:
            actor.userId,

          workspaceId:
            actor.workspaceId,

          change,
        });


    return reply.send(
      result,
    );

  };


  receiveWebhook =
  async (
    request:FastifyRequest,
    reply:FastifyReply,
  ) => {

    const rawBody =
      (
        request as RawBodyRequest
      ).rawBody;


    if(!rawBody){

      throw new AppError(
        "HITPAY_RAW_BODY_MISSING",
        "Raw webhook body is unavailable",
        500,
      );

    }


    const diagnosticSignature =
      this.headerValue(
        request.headers[
          "hitpay-signature"
        ],
      );


    const diagnosticEventObject =
      this.headerValue(
        request.headers[
          "hitpay-event-object"
        ],
      )
        .trim()
        .toLowerCase();


    const diagnosticEventType =
      this.headerValue(
        request.headers[
          "hitpay-event-type"
        ],
      )
        .trim()
        .toLowerCase();


    const diagnosticUserAgent =
      this.headerValue(
        request.headers[
          "user-agent"
        ],
      )
        .trim();


    request.log.warn(
      {
        hitpayWebhookTransport:{
          userAgent:
            diagnosticUserAgent
            ||
            null,

          signaturePresent:
            Boolean(
              diagnosticSignature
                .trim(),
            ),

          signatureLength:
            diagnosticSignature
              .trim()
              .replace(
                /^sha256=/i,
                "",
              )
              .length,

          eventObject:
            diagnosticEventObject
            ||
            null,

          eventType:
            diagnosticEventType
            ||
            null,

          rawBodyLength:
            rawBody.length,

          contentType:
            this.headerValue(
              request.headers[
                "content-type"
              ],
            )
            ||
            null,

          contentEncoding:
            this.headerValue(
              request.headers[
                "content-encoding"
              ],
            )
            ||
            null,

          contentLength:
            this.headerValue(
              request.headers[
                "content-length"
              ],
            )
            ||
            null,

          transferEncoding:
            this.headerValue(
              request.headers[
                "transfer-encoding"
              ],
            )
            ||
            null,
        },
      },
      "HitPay webhook transport diagnostic",
    );


    const result =
      await this.service
        .recordWebhook({
          rawBody,

          signature:
            this.headerValue(
              request.headers[
                "hitpay-signature"
              ],
            ),

          eventObject:
            this.headerValue(
              request.headers[
                "hitpay-event-object"
              ],
            ),

          eventType:
            this.headerValue(
              request.headers[
                "hitpay-event-type"
              ],
            ),

          payload:
            request.body,
        });


    return reply.send(
      result,
    );

  };


  private headerValue(
    value:
      string
      |
      string[]
      |
      undefined,
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


    return value
    ??
    "";

  }


}
