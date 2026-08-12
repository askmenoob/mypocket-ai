import type {
  FastifyPluginAsync,
  FastifyRequest,
} from "fastify";

import {
  env,
} from "../../config/index.js";
import { requireSuperAdmin } from "../../shared/auth/index.js";

import { BillingSettingsController } from "./billing-settings.controller.js";
import { BillingSubscriptionController } from "./billing-subscription.controller.js";
import { BillingSubscriptionService } from "./billing-subscription.service.js";
import { activeChipWebhookPath } from "../../config/chip-environment.js";
import { ChipBillingController } from "./chip-billing.controller.js";
import { ChipBillingService } from "./chip-billing.service.js";


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


  const subscriptionController =
    new BillingSubscriptionController(
      new BillingSubscriptionService(app),
    );

  const settingsController =
    new BillingSettingsController(
      app,
    );

  const chipController =
    new ChipBillingController(
      new ChipBillingService(app),
    );


  app.get(
    "/billing/subscription",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    subscriptionController.getSubscription,
  );

  app.get(
    "/billing/admin/settings",
    {
      preHandler:[
        app.authenticate,
        requireSuperAdmin,
      ],
    },
    settingsController.getSettings,
  );

  app.patch(
    "/billing/admin/settings/annual-discount",
    {
      preHandler:[
        app.authenticate,
        requireSuperAdmin,
      ],
    },
    settingsController.updateAnnualDiscount,
  );

  app.get(
    "/billing/quote",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    chipController.getQuote,
  );

  app.get(
    "/billing/chip/payment-methods",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    chipController.getPaymentMethods,
  );

  app.post(
    "/billing/checkout",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    chipController.createCheckout,
  );

  app.post(
    "/billing/cancel-renewal",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    chipController.cancelAutomaticRenewal,
  );

  app.post(
    activeChipWebhookPath(
      env.CHIP_ENVIRONMENT,
    ),
    chipController.receiveWebhook,
  );

};


export default billingModule;
