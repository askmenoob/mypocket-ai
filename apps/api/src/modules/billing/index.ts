import type {
  FastifyPluginAsync,
  FastifyRequest,
} from "fastify";

import {
  BillingController,
} from "./billing.controller.js";

import {
  BillingService,
} from "./billing.service.js";


type RawBodyRequest =
  FastifyRequest
  &
  {
    rawBody:
      Buffer
      |
      null;
  };


const billingModule:
FastifyPluginAsync =
async (
  app,
) => {

  app.decorateRequest(
    "rawBody",
    null,
  );


  app.removeContentTypeParser(
    "application/json",
  );


  app.addContentTypeParser(
    "application/json",
    {
      parseAs:
        "buffer",

      bodyLimit:
        1024 * 1024,
    },
    (
      request,
      body,
      done,
    ) => {

      const rawBody =
        Buffer.isBuffer(
          body,
        )
          ? body
          : Buffer.from(
            body,
          );


      (
        request as RawBodyRequest
      ).rawBody =
        rawBody;


      if(
        rawBody.length === 0
      ){

        done(
          null,
          {},
        );

        return;

      }


      try{

        done(
          null,
          JSON.parse(
            rawBody.toString(
              "utf8",
            ),
          ),
        );

      }catch(error){

        const parsingError =
          error as
            Error
            &
            {
              statusCode?:number;
            };


        parsingError.statusCode =
          400;


        done(
          parsingError,
        );

      }

    },
  );


  const service =
    new BillingService(
      app,
    );


  const controller =
    new BillingController(
      service,
    );


  app.get(
    "/billing/subscription",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.getSubscription,
  );


  app.post(
    "/billing/hitpay/checkout",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.createCheckout,
  );


  app.put(
    "/billing/hitpay/plan",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.changePlan,
  );


  app.post(
    "/billing/hitpay/webhook/sandbox",
    controller.receiveWebhook,
  );


  app.post(
    "/billing/hitpay/webhook/production",
    controller.receiveWebhook,
  );

};


export default billingModule;
