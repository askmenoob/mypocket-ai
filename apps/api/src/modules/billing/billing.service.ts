import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import type {
  FastifyInstance,
} from "fastify";

import type {
  Prisma,
} from "../../generated/prisma/client.js";

import {
  env,
} from "../../config/index.js";

import {
  AppError,
} from "../../shared/errors/app-error.js";

import type {
  ChangeHitPayPlanInput,
  CreateHitPayCheckoutInput,
  PaidBillingPlan,
} from "./billing.schemas.js";

import {
  HitPayClient,
} from "./hitpay.client.js";

import {
  assertBillingProviderCallAllowed,
} from "./billing-provider.policy.js";

import {
  GoogleDriveService,
} from "../google/drive/google-drive.service.js";

import {
  buildMyPocketRootFolderName,
} from "../google/drive/google-root-folder-name.js";


type JsonRecord =
  Record<
    string,
    unknown
  >;


type AutoCreatedRootFolderRenameInput = {
  workspaceId:string;
  plan:PaidBillingPlan;
};


type BillingServiceDependencies = {
  renameAutoCreatedRootFolder?:
    (
      input:AutoCreatedRootFolderRenameInput,
    ) => Promise<void>;
};


const PLAN_CONFIGURATION:
Record<
  PaidBillingPlan,
  {
    amount:number;
    displayName:string;
    providerPlanId:string;
  }
> = {

  PERSONAL_PRO:{
    amount:
      9,

    displayName:
      "Personal Pro",

    providerPlanId:
      env.HITPAY_PLAN_PERSONAL_PRO_ID,
  },

  FAMILY:{
    amount:
      19,

    displayName:
      "Family",

    providerPlanId:
      env.HITPAY_PLAN_FAMILY_ID,
  },

  BUSINESS:{
    amount:
      49,

    displayName:
      "Business/Company",

    providerPlanId:
      env.HITPAY_PLAN_BUSINESS_ID,
  },

};


export class BillingService {


  private readonly hitPay =
    new HitPayClient();


  private readonly renameAutoCreatedRootFolder:
    (
      input:AutoCreatedRootFolderRenameInput,
    ) => Promise<void>;


  constructor(
    private readonly app:
      FastifyInstance,
    dependencies?:BillingServiceDependencies,
  ){
    this.renameAutoCreatedRootFolder =
      dependencies
        ?.renameAutoCreatedRootFolder
      ??
      (
        async (input) => {
          await this.renameWorkspaceRootFolder(
            input,
          );
        }
      );
  }


  async getSubscription(
    input:{
      userId:string;
      workspaceId:string;
    },
  ){

    const membership =
      await this.findMembership(
        input.userId,
        input.workspaceId,
      );


    const billing =
      membership.workspace
        .billingSubscription;

    const renewalHistory =
      billing
        ? await this.app.prisma.billingRenewal.findMany({
            where:{
              workspaceBillingSubscriptionId:
                billing.id,
            },
            orderBy:{
              createdAt:
                "desc",
            },
            take:
              10,
            select:{
              id:true,
              invoiceReference:true,
              status:true,
              plan:true,
              billingInterval:true,
              renewalMethod:true,
              currency:true,
              amountDue:true,
              periodStart:true,
              periodEnd:true,
              dueAt:true,
              graceEndsAt:true,
              paidAt:true,
              createdAt:true,
            },
          })
        : [];


    return {
      workspace:{
        id:
          membership.workspace.id,

        name:
          membership.workspace.name,

        type:
          membership.workspace.type,

        role:
          membership.role,
      },

      access:{
        plan:
          membership.user
            .subscription?.plan
          ??
          "FREE",

        status:
          membership.user
            .subscription?.status
          ??
          "ACTIVE",

        expiresAt:
          membership.user
            .subscription?.expiresAt
          ??
          null,
      },

      billing:
        billing
          ? {
            plan:
              billing.plan,

            pendingPlan:
              billing.pendingPlan,

            planChangeRequestedAt:
              billing.planChangeRequestedAt,

            status:
              billing.status,

            provider:
              billing.provider,

            checkoutUrl:
              billing.checkoutUrl,

            currentPeriodStart:
              billing.currentPeriodStart,

            currentPeriodEnd:
              billing.currentPeriodEnd,

            lastPaymentAt:
              billing.lastPaymentAt,

            lastPaymentStatus:
              billing.lastPaymentStatus,

            canceledAt:
              billing.canceledAt,

            billingInterval:
              billing.billingInterval,

            renewalMethod:
              billing.renewalMethod,

            accessState:
              billing.accessState,

            paidThroughAt:
              billing.paidThroughAt,

            nextRenewalAt:
              billing.nextRenewalAt,

            paymentDueAt:
              billing.paymentDueAt,

            graceEndsAt:
              billing.graceEndsAt,

            autoRenewEnabled:
              billing.autoRenewEnabled,

            cancelAtPeriodEnd:
              billing.cancelAtPeriodEnd,
          }
          : null,

      renewalHistory,
    };

  }


  async createCheckout(
    input:{
      userId:string;
      workspaceId:string;
      checkout:
        CreateHitPayCheckoutInput;
    },
  ){

    assertBillingProviderCallAllowed(
      env.BILLING_CHECKOUT_PROVIDER,
      "hitpay",
    );

    const membership =
      await this.findMembership(
        input.userId,
        input.workspaceId,
      );


    if(
      membership.role !== "OWNER"
      ||
      membership.workspace.ownerId
        !== input.userId
    ){

      throw new AppError(
        "BILLING_OWNER_REQUIRED",
        (
          "Only the workspace owner "
          +
          "can manage subscriptions"
        ),
        403,
      );

    }


    const requestedPlan =
      input.checkout.plan;


    if(
      requestedPlan === "PERSONAL_PRO"
    ){

      const familyMembership =
        await this.app.prisma.workspaceMember.findFirst({
          where:{
            userId:
              input.userId,

            workspace:{
              type:
                "FAMILY",
            },
          },
        });


      if(familyMembership){

        throw new AppError(
          "FAMILY_MEMBER_CANNOT_BUY_PERSONAL_PRO",
          "Please leave Family workspace before purchasing Personal Pro",
          403,
        );

      }

    }






    const configuration =
      PLAN_CONFIGURATION[
        requestedPlan
      ];


    const existingBilling =
      membership.workspace
        .billingSubscription;


    if(
      membership.user.subscription?.plan
        === requestedPlan
      &&
      membership.user.subscription.status
        === "ACTIVE"
    ){

      throw new AppError(
        "BILLING_ACCESS_ALREADY_ACTIVE",
        "This package is already active",
        409,
      );

    }


    if(
      existingBilling?.plan
        === requestedPlan
      &&
      existingBilling.status
        === "ACTIVE"
    ){

      throw new AppError(
        "BILLING_PLAN_ALREADY_ACTIVE",
        "This billing plan is already active",
        409,
      );

    }


    if(
      existingBilling?.plan
        === requestedPlan
      &&
      existingBilling.checkoutUrl
      &&
      [
        "CHECKOUT_PENDING",
        "SCHEDULED",
        "PENDING",
      ].includes(
        existingBilling.status,
      )
    ){

      return {
        checkoutUrl:
          existingBilling.checkoutUrl,

        reference:
          existingBilling
            .checkoutReference,

        providerSubscriptionId:
          existingBilling
            .providerSubscriptionId,

        plan:
          requestedPlan,

        displayName:
          configuration.displayName,

        amount:
          configuration.amount,

        currency:
          "MYR",

        reused:
          true,
      };

    }


    if(
      existingBilling
      &&
      existingBilling
        .providerSubscriptionId
      &&
      [
        "CHECKOUT_PENDING",
        "SCHEDULED",
        "PENDING",
        "ACTIVE",
        "RETRYING",
        "PAUSED",
        "PLAN_CHANGE_PAYMENT_PENDING",
        "PLAN_CHANGE_REVIEW_REQUIRED",
      ].includes(
        existingBilling.status,
      )
    ){

      throw new AppError(
        "BILLING_CHECKOUT_EXISTS",
        (
          "A subscription checkout already "
          +
          "exists for this workspace"
        ),
        409,
      );

    }


    const reference =
      [
        "imai",
        input.workspaceId,
        requestedPlan.toLowerCase(),
        Date.now(),
        randomUUID(),
      ].join(
        "_",
      );


    const fallbackName =
      membership.user.email
        .split(
          "@",
        )[0]
      ||
      "MyPocket User";


    const response =
      await this.hitPay.request({
        method:
          "POST",

        path:
          "/v1/recurring-billing",

        body:{
          customer_email:
            membership.user.email,

          customer_name:
            membership.user.name
            ||
            fallbackName,

          start_date:
            this.singaporeDate(
              new Date(),
            ),

          plan_id:
            configuration
              .providerPlanId,

          redirect_url:
            env.HITPAY_RETURN_URL,

          send_email:
            "true",

          reference,
        },
      });


    if(
      response.status !== 200
      &&
      response.status !== 201
    ){

      this.app.log.error(
        {
          hitPayStatus:
            response.status,
        },
        "HITPAY_CREATE_RECURRING_BILLING_FAILED",
      );


      throw new AppError(
        "HITPAY_CHECKOUT_FAILED",
        "HitPay could not create the checkout",
        502,
      );

    }


    if(
      !this.isRecord(
        response.payload,
      )
    ){

      throw new AppError(
        "HITPAY_RESPONSE_INVALID",
        "HitPay returned an invalid response",
        502,
      );

    }


    const providerSubscriptionId =
      this.stringValue(
        response.payload.id,
      );


    const checkoutUrl =
      this.stringValue(
        response.payload.url,
      );


    if(
      !providerSubscriptionId
      ||
      !checkoutUrl
    ){

      throw new AppError(
        "HITPAY_RESPONSE_INCOMPLETE",
        "HitPay returned an incomplete response",
        502,
      );

    }


    await this.app.prisma
      .workspaceBillingSubscription
      .upsert({
        where:{
          workspaceId:
            membership.workspaceId,
        },

        create:{
          workspaceId:
            membership.workspaceId,

          ownerUserId:
            input.userId,

          plan:
            requestedPlan,

          status:
            "CHECKOUT_PENDING",

          provider:
            "HITPAY",

          providerPlanId:
            configuration
              .providerPlanId,

          providerSubscriptionId,

          checkoutReference:
            reference,

          checkoutUrl,
        },

        update:{
          ownerUserId:
            input.userId,

          plan:
            requestedPlan,

          status:
            "CHECKOUT_PENDING",

          provider:
            "HITPAY",

          providerPlanId:
            configuration
              .providerPlanId,

          providerSubscriptionId,

          checkoutReference:
            reference,

          checkoutUrl,

          currentPeriodStart:
            null,

          currentPeriodEnd:
            null,

          lastPaymentAt:
            null,

          lastPaymentStatus:
            null,

          canceledAt:
            null,

          lastWebhookAt:
            null,
        },
      });


    return {
      checkoutUrl,
      reference,
      providerSubscriptionId,

      plan:
        requestedPlan,

      displayName:
        configuration.displayName,

      amount:
        configuration.amount,

      currency:
        "MYR",

      reused:
        false,
    };

  }


  async changePlan(
    input:{
      userId:string;
      workspaceId:string;
      change:
        ChangeHitPayPlanInput;
    },
  ){

    assertBillingProviderCallAllowed(
      env.BILLING_CHECKOUT_PROVIDER,
      "hitpay",
    );

    const membership =
      await this.findMembership(
        input.userId,
        input.workspaceId,
      );


    if(
      membership.role !== "OWNER"
      ||
      membership.workspace.ownerId
        !== input.userId
    ){

      throw new AppError(
        "BILLING_OWNER_REQUIRED",
        (
          "Only the workspace owner "
          +
          "can manage subscriptions"
        ),
        403,
      );

    }


    const requestedPlan =
      input.change.plan;


    if(
      requestedPlan === "PERSONAL_PRO"
    ){

      const familyMembership =
        await this.app.prisma
          .workspaceMember
          .findFirst({
            where:{
              userId:
                input.userId,

              workspace:{
                type:
                  "FAMILY",
              },
            },
          });


      if(familyMembership){

        throw new AppError(
          "FAMILY_MEMBER_CANNOT_BUY_PERSONAL_PRO",
          "Please leave Family workspace before purchasing Personal Pro",
          403,
        );

      }

    }


    const billing =
      membership.workspace
        .billingSubscription;


    if(
      !billing
      ||
      !billing.providerSubscriptionId
    ){

      throw new AppError(
        "BILLING_RECURRING_NOT_FOUND",
        (
          "An active recurring subscription "
          +
          "is required before changing plan"
        ),
        409,
      );

    }


    const currentPlan =
      billing.plan as PaidBillingPlan;


    const currentConfiguration =
      PLAN_CONFIGURATION[
        currentPlan
      ];


    const configuration =
      PLAN_CONFIGURATION[
        requestedPlan
      ];


    if(
      !currentConfiguration
      ||
      !configuration
    ){

      throw new AppError(
        "BILLING_PLAN_INVALID",
        "Billing plan configuration is invalid",
        500,
      );

    }


    if(
      billing.plan === requestedPlan
      &&
      !billing.pendingPlan
    ){

      throw new AppError(
        "BILLING_PLAN_ALREADY_ACTIVE",
        "This billing plan is already active",
        409,
      );

    }


    const amountDueNow =
      Math.round(
        Math.max(
          0,
          configuration.amount
          -
          currentConfiguration.amount,
        )
        *
        100,
      )
      /
      100;


    if(
      billing.pendingPlan === requestedPlan
      &&
      [
        "PLAN_CHANGE_PAYMENT_PENDING",
        "PLAN_CHANGE_REVIEW_REQUIRED",
      ].includes(
        billing.status,
      )
    ){

      return {
        currentPlan:
          billing.plan,

        pendingPlan:
          billing.pendingPlan,

        status:
          billing.status,

        effective:
          "AFTER_PAYMENT",

        paymentStatus:
          billing.status
            === "PLAN_CHANGE_PAYMENT_PENDING"
              ? "AWAITING_WEBHOOK"
              : "REVIEW_REQUIRED",

        amountDueNow,

        currency:
          "MYR",

        reused:
          true,
      };

    }


    if(
      ![
        "ACTIVE",
        "SCHEDULED",
        "RETRYING",
      ].includes(
        billing.status,
      )
    ){

      throw new AppError(
        "BILLING_PLAN_CHANGE_NOT_AVAILABLE",
        (
          "The subscription status does not "
          +
          "allow a plan change"
        ),
        409,
      );

    }


    const providerPath =
      (
        "/v1/recurring-billing/"
        +
        encodeURIComponent(
          billing.providerSubscriptionId,
        )
      );


    if(amountDueNow === 0){

      if(
        billing.pendingPlan
          === requestedPlan
      ){

        return {
          currentPlan:
            billing.plan,

          pendingPlan:
            billing.pendingPlan,

          status:
            billing.status,

          effective:
            "NEXT_CYCLE",

          amountDueNow:
            0,

          currency:
            "MYR",

          reused:
            true,
        };

      }


      const response =
        await this.hitPay.request({
          method:
            "PUT",

          path:
            providerPath,

          body:{
            plan_id:
              configuration.providerPlanId,
          },
        });


      if(
        response.status !== 200
        ||
        !this.isRecord(
          response.payload,
        )
      ){

        throw new AppError(
          "HITPAY_PLAN_CHANGE_FAILED",
          "HitPay could not schedule the billing downgrade",
          502,
        );

      }


      const responsePlanId =
        this.firstString(
          response.payload
            .business_recurring_plans_id,

          response.payload
            .plan_id,
        );


      if(
        responsePlanId
        &&
        responsePlanId
          !== configuration.providerPlanId
      ){

        throw new AppError(
          "HITPAY_PLAN_CHANGE_MISMATCH",
          "HitPay returned a different billing plan",
          502,
        );

      }


      const updated =
        await this.app.prisma
          .workspaceBillingSubscription
          .update({
            where:{
              id:
                billing.id,
            },

            data:{
              pendingPlan:
                requestedPlan,

              pendingProviderPlanId:
                configuration.providerPlanId,

              planChangeRequestedAt:
                new Date(),

              checkoutUrl:
                this.stringValue(
                  response.payload.url,
                )
                ||
                billing.checkoutUrl,
            },
          });


      return {
        currentPlan:
          updated.plan,

        pendingPlan:
          updated.pendingPlan,

        status:
          updated.status,

        effective:
          "NEXT_CYCLE",

        amountDueNow:
          0,

        currency:
          "MYR",

        reused:
          false,
      };

    }


    const reservedAt =
      new Date();


    const originalBillingStatus =
      billing.status;


    const reservation =
      await this.app.prisma
        .workspaceBillingSubscription
        .updateMany({
          where:{
            id:
              billing.id,

            updatedAt:
              billing.updatedAt,
          },

          data:{
            pendingPlan:
              requestedPlan,

            pendingProviderPlanId:
              configuration.providerPlanId,

            planChangeRequestedAt:
              reservedAt,

            status:
              "PLAN_CHANGE_PAYMENT_PENDING",

            lastPaymentStatus:
              "PENDING",
          },
        });


    if(reservation.count !== 1){

      const concurrent =
        await this.app.prisma
          .workspaceBillingSubscription
          .findUnique({
            where:{
              id:
                billing.id,
            },
          });


      if(
        concurrent?.pendingPlan
          === requestedPlan
        &&
        [
          "PLAN_CHANGE_PAYMENT_PENDING",
          "PLAN_CHANGE_REVIEW_REQUIRED",
        ].includes(
          concurrent.status,
        )
      ){

        return {
          currentPlan:
            concurrent.plan,

          pendingPlan:
            concurrent.pendingPlan,

          status:
            concurrent.status,

          effective:
            "AFTER_PAYMENT",

          paymentStatus:
            concurrent.status
              === "PLAN_CHANGE_PAYMENT_PENDING"
                ? "AWAITING_WEBHOOK"
                : "REVIEW_REQUIRED",

          amountDueNow,

          currency:
            "MYR",

          reused:
            true,
        };

      }


      throw new AppError(
        "BILLING_PLAN_CHANGE_CONFLICT",
        "The billing plan changed while this request was being processed",
        409,
      );

    }


    const markReviewRequired =
      async () => {
        await this.app.prisma
          .workspaceBillingSubscription
          .updateMany({
            where:{
              id:
                billing.id,

              pendingPlan:
                requestedPlan,
            },

            data:{
              status:
                "PLAN_CHANGE_REVIEW_REQUIRED",

              lastPaymentStatus:
                "UNKNOWN",
            },
          });
      };


    const clearFailedUpgrade =
      async () => {
        let rollback;


        try{
          rollback =
            await this.hitPay.request({
              method:
                "PUT",

              path:
                providerPath,

              body:{
                plan_id:
                  currentConfiguration.providerPlanId,
              },
            });
        }catch{
          await markReviewRequired();

          throw new AppError(
            "HITPAY_PLAN_CHANGE_ROLLBACK_FAILED",
            "HitPay plan change needs manual review",
            502,
          );
        }


        if(rollback.status !== 200){
          await markReviewRequired();

          throw new AppError(
            "HITPAY_PLAN_CHANGE_ROLLBACK_FAILED",
            "HitPay plan change needs manual review",
            502,
          );
        }


        await this.app.prisma
          .workspaceBillingSubscription
          .updateMany({
            where:{
              id:
                billing.id,

              pendingPlan:
                requestedPlan,
            },

            data:{
              pendingPlan:
                null,

              pendingProviderPlanId:
                null,

              planChangeRequestedAt:
                null,

              status:
                originalBillingStatus,

              lastPaymentStatus:
                "FAILED",
            },
          });
      };


    const providerAlreadyTargeted =
      billing.pendingPlan
        === requestedPlan
      &&
      billing.pendingProviderPlanId
        === configuration.providerPlanId;


    if(!providerAlreadyTargeted){

      let providerUpdate;


      try{
        providerUpdate =
          await this.hitPay.request({
            method:
              "PUT",

            path:
              providerPath,

            body:{
              plan_id:
                configuration.providerPlanId,
            },
          });
      }catch{
        await markReviewRequired();

        throw new AppError(
          "HITPAY_PLAN_CHANGE_UNCERTAIN",
          "HitPay plan update needs manual review",
          502,
        );
      }


      if(
        providerUpdate.status !== 200
        ||
        !this.isRecord(
          providerUpdate.payload,
        )
      ){
        await markReviewRequired();

        throw new AppError(
          "HITPAY_PLAN_CHANGE_UNCERTAIN",
          "HitPay plan update needs manual review",
          502,
        );
      }


      const responsePlanId =
        this.firstString(
          providerUpdate.payload
            .business_recurring_plans_id,

          providerUpdate.payload
            .plan_id,
        );


      if(
        responsePlanId
        &&
        responsePlanId
          !== configuration.providerPlanId
      ){
        await markReviewRequired();

        throw new AppError(
          "HITPAY_PLAN_CHANGE_MISMATCH",
          "HitPay returned a different billing plan",
          502,
        );
      }

    }


    let paymentResponse;


    try{
      paymentResponse =
        await this.hitPay.request({
          method:
            "POST",

          path:
            (
              "/v1/charge/recurring-billing/"
              +
              encodeURIComponent(
                billing.providerSubscriptionId,
              )
            ),

          body:{
            amount:
              amountDueNow,

            currency:
              "MYR",
          },

          encoding:
            "form",
        });
    }catch{
      await markReviewRequired();

      throw new AppError(
        "HITPAY_PLAN_CHANGE_PAYMENT_UNCERTAIN",
        "HitPay payment needs manual review",
        502,
      );
    }


    if(
      paymentResponse.status >= 400
      &&
      paymentResponse.status < 500
    ){
      await clearFailedUpgrade();

      throw new AppError(
        "HITPAY_PLAN_CHANGE_PAYMENT_FAILED",
        "HitPay could not collect the upgrade balance",
        402,
      );
    }


    if(
      ![
        200,
        201,
      ].includes(
        paymentResponse.status,
      )
      ||
      !this.isRecord(
        paymentResponse.payload,
      )
    ){
      await markReviewRequired();

      throw new AppError(
        "HITPAY_PLAN_CHANGE_PAYMENT_UNCERTAIN",
        "HitPay payment needs manual review",
        502,
      );
    }


    const providerPaymentStatus =
      this.stringValue(
        paymentResponse.payload.status,
      )
        .toLowerCase();


    if(
      [
        "failed",
        "declined",
        "canceled",
        "cancelled",
      ].includes(
        providerPaymentStatus,
      )
    ){
      await clearFailedUpgrade();

      throw new AppError(
        "HITPAY_PLAN_CHANGE_PAYMENT_FAILED",
        "HitPay could not collect the upgrade balance",
        402,
      );
    }


    if(
      ![
        "succeeded",
        "success",
        "paid",
        "pending",
        "processing",
      ].includes(
        providerPaymentStatus,
      )
    ){
      await markReviewRequired();

      throw new AppError(
        "HITPAY_PLAN_CHANGE_PAYMENT_UNCERTAIN",
        "HitPay payment needs manual review",
        502,
      );
    }


    const providerAmount =
      this.numberValue(
        paymentResponse.payload.amount,
      );


    const providerCurrency =
      this.stringValue(
        paymentResponse.payload.currency,
      )
        .toUpperCase();


    if(
      (
        providerAmount !== null
        &&
        Math.round(
          providerAmount
          *
          100,
        )
          !==
        Math.round(
          amountDueNow
          *
          100,
        )
      )
      ||
      (
        providerCurrency
        &&
        providerCurrency !== "MYR"
      )
    ){
      await markReviewRequired();

      throw new AppError(
        "HITPAY_PLAN_CHANGE_PAYMENT_MISMATCH",
        "HitPay charged an unexpected upgrade amount",
        502,
      );
    }


    return {
      currentPlan:
        billing.plan,

      pendingPlan:
        requestedPlan,

      status:
        "PLAN_CHANGE_PAYMENT_PENDING",

      effective:
        "AFTER_PAYMENT",

      paymentStatus:
        "AWAITING_WEBHOOK",

      amountDueNow,

      currency:
        "MYR",

      reused:
        false,
    };

  }


  async recordWebhook(
    input:{
      rawBody:Buffer;
      signature:string;
      eventObject:string;
      eventType:string;
      payload:unknown;
    },
  ){

    const diagnosticSignature =
      input.signature
        .trim()
        .toLowerCase()
        .replace(
          /^sha256=/,
          "",
        );


    const diagnosticExpectedSignature =
      createHmac(
        "sha256",
        this.hitPayWebhookSalt(),
      )
        .update(
          input.rawBody,
        )
        .digest(
          "hex",
        );


    const diagnosticRawBodyText =
      input.rawBody
        .toString(
          "utf8",
        );


    const diagnosticCompactJson =
      JSON.stringify(
        input.payload,
      )
      ??
      "";


    const diagnosticPrettyJson =
      JSON.stringify(
        input.payload,
        null,
        2,
      )
      ??
      "";


    const diagnosticCanonicalize =
      (
        value:unknown,
      ):unknown => {

        if(
          Array.isArray(
            value,
          )
        ){

          return value.map(
            diagnosticCanonicalize,
          );

        }


        if(
          value
          &&
          typeof value === "object"
        ){

          return Object.fromEntries(
            Object.entries(
              value as
                Record<
                  string,
                  unknown
                >,
            )
              .sort(
                (
                  [
                    left,
                  ],
                  [
                    right,
                  ],
                ) =>
                  left.localeCompare(
                    right,
                  ),
              )
              .map(
                (
                  [
                    key,
                    nestedValue,
                  ],
                ) => [
                  key,
                  diagnosticCanonicalize(
                    nestedValue,
                  ),
                ],
              ),
          );

        }


        return value;

      };


    const diagnosticCanonicalJson =
      JSON.stringify(
        diagnosticCanonicalize(
          input.payload,
        ),
      )
      ??
      "";


    const diagnosticPayloadCandidates:
      Array<
        [
          string,
          Buffer
          |
          string,
        ]
      > =
      [
        [
          "raw_body",
          input.rawBody,
        ],

        [
          "raw_without_terminal_newline",
          diagnosticRawBodyText
            .replace(
              /\r?\n$/,
              "",
            ),
        ],

        [
          "raw_plus_lf",
          `${diagnosticRawBodyText}\n`,
        ],

        [
          "raw_plus_crlf",
          `${diagnosticRawBodyText}\r\n`,
        ],

        [
          "lf_normalized",
          diagnosticRawBodyText
            .replace(
              /\r\n/g,
              "\n",
            ),
        ],

        [
          "crlf_normalized",
          diagnosticRawBodyText
            .replace(
              /\r?\n/g,
              "\r\n",
            ),
        ],

        [
          "compact_json",
          diagnosticCompactJson,
        ],

        [
          "compact_json_lf",
          `${diagnosticCompactJson}\n`,
        ],

        [
          "compact_json_crlf",
          `${diagnosticCompactJson}\r\n`,
        ],

        [
          "pretty_json_2",
          diagnosticPrettyJson,
        ],

        [
          "pretty_json_2_lf",
          `${diagnosticPrettyJson}\n`,
        ],

        [
          "canonical_sorted_json",
          diagnosticCanonicalJson,
        ],

        [
          "canonical_sorted_json_lf",
          `${diagnosticCanonicalJson}\n`,
        ],
      ];


    const diagnosticMatchingPayloadVariants =
      diagnosticPayloadCandidates
        .filter(
          (
            [
              ,
              candidatePayload,
            ],
          ) =>
            createHmac(
              "sha256",
              this.hitPayWebhookSalt(),
            )
              .update(
                candidatePayload,
              )
              .digest(
                "hex",
              )
            ===
            diagnosticSignature,
        )
        .map(
          (
            [
              candidateName,
            ],
          ) =>
            candidateName,
        );


    const diagnosticKeyCandidates:
      Array<
        [
          string,
          Buffer
          |
          string,
        ]
      > =
      [
        [
          "salt_literal_utf8",
          this.hitPayWebhookSalt(),
        ],
      ];


    if(
      this.hitPayWebhookSalt().length % 4
        === 0
      &&
      /^[A-Za-z0-9+/]+={0,2}$/.test(
        this.hitPayWebhookSalt(),
      )
    ){

      const decodedSalt =
        Buffer.from(
          this.hitPayWebhookSalt(),
          "base64",
        );


      if(
        decodedSalt.length > 0
      ){

        diagnosticKeyCandidates.push(
          [
            "salt_base64_decoded",
            decodedSalt,
          ],
        );

      }

    }


    const diagnosticMatchingKeyVariants =
      diagnosticKeyCandidates
        .filter(
          (
            [
              ,
              candidateKey,
            ],
          ) =>
            createHmac(
              "sha256",
              candidateKey,
            )
              .update(
                input.rawBody,
              )
              .digest(
                "hex",
              )
            ===
            diagnosticSignature,
        )
        .map(
          (
            [
              candidateName,
            ],
          ) =>
            candidateName,
        );


    const diagnosticPayloadRecord =
      this.isRecord(
        input.payload,
      )
        ? input.payload
        : null;


    const diagnosticBusinessId =
      diagnosticPayloadRecord
        ? this.stringValue(
            diagnosticPayloadRecord[
              "business_id"
            ],
          )
        : "";


    const diagnosticPayloadId =
      diagnosticPayloadRecord
        ? this.stringValue(
            diagnosticPayloadRecord[
              "id"
            ],
          )
        : "";


    const diagnosticNestedRecurringBillingRecord =
      diagnosticPayloadRecord
      &&
      this.isRecord(
        diagnosticPayloadRecord[
          "recurring_billing"
        ],
      )
        ? diagnosticPayloadRecord[
            "recurring_billing"
          ]
        : null;


    const diagnosticRecurringBillingId =
      diagnosticNestedRecurringBillingRecord
        ? this.stringValue(
            diagnosticNestedRecurringBillingRecord[
              "id"
            ],
          )
        : "";


    const diagnosticRecurringPlanId =
      diagnosticNestedRecurringBillingRecord
        ? this.stringValue(
            diagnosticNestedRecurringBillingRecord[
              "business_recurring_plans_id"
            ],
          )
        : "";


    const diagnosticRecurringReference =
      diagnosticNestedRecurringBillingRecord
        ? this.stringValue(
            diagnosticNestedRecurringBillingRecord[
              "reference"
            ],
          )
        : "";


    const diagnosticAffectedMethodId =
      diagnosticPayloadRecord
        ? this.stringValue(
            diagnosticPayloadRecord[
              "affected_method_id"
            ],
          )
        : "";


    const diagnosticRecurringPlanEnvironmentMatches =
      (
        [
          [
            "HITPAY_PLAN_PERSONAL_PRO_ID",
            env.HITPAY_PLAN_PERSONAL_PRO_ID,
          ],
          [
            "HITPAY_PLAN_FAMILY_ID",
            env.HITPAY_PLAN_FAMILY_ID,
          ],
          [
            "HITPAY_PLAN_BUSINESS_ID",
            env.HITPAY_PLAN_BUSINESS_ID,
          ],
        ] as
          Array<
            [
              string,
              string,
            ]
          >
      )
        .filter(
          (
            [
              ,
              configuredPlanId,
            ],
          ) =>
            Boolean(
              diagnosticRecurringPlanId,
            )
            &&
            configuredPlanId
            ===
            diagnosticRecurringPlanId,
        )
        .map(
          (
            [
              environmentName,
            ],
          ) =>
            environmentName,
        );


    const diagnosticSafeKey =
      (
        key:string,
      ) => {

        const trimmed =
          key.trim();


        if(
          !trimmed
          ||
          trimmed.length > 48
          ||
          trimmed.includes(
            "@",
          )
          ||
          /^[a-f0-9]{8}-[a-f0-9-]{27,}$/i.test(
            trimmed,
          )
        ){

          return "[dynamic]";

        }


        return trimmed
          .replace(
            /[^A-Za-z0-9_.-]/g,
            "_",
          );

      };


    const diagnosticPayloadShape:
      string[] =
      [];


    const diagnosticNestedPayloadCandidates:
      Array<
        [
          string,
          string,
        ]
      > =
      [];


    const diagnosticCandidateNames =
      new Set<
        string
      >();


    const diagnosticAddNestedCandidate =
      (
        name:string,
        value:string,
      ) => {

        if(
          !value
          ||
          diagnosticNestedPayloadCandidates
            .length
            >= 128
          ||
          diagnosticCandidateNames
            .has(
              name,
            )
        ){

          return;

        }


        diagnosticCandidateNames
          .add(
            name,
          );


        diagnosticNestedPayloadCandidates
          .push(
            [
              name,
              value,
            ],
          );

      };


    const diagnosticVisitPayload:
      (
        value:unknown,
        path:string,
        depth:number,
      ) => void =
      (
        value,
        path,
        depth,
      ) => {

        if(
          depth > 5
          ||
          diagnosticPayloadShape.length
            >= 160
        ){

          return;

        }


        if(
          value === null
        ){

          diagnosticPayloadShape.push(
            `${path}:null`,
          );

          return;

        }


        if(
          Array.isArray(
            value,
          )
        ){

          diagnosticPayloadShape.push(
            `${path}:array[length=${value.length}]`,
          );


          if(
            path !== "$"
          ){

            const compact =
              JSON.stringify(
                value,
              )
              ??
              "";


            const pretty =
              JSON.stringify(
                value,
                null,
                2,
              )
              ??
              "";


            diagnosticAddNestedCandidate(
              `${path}:array_compact`,
              compact,
            );


            diagnosticAddNestedCandidate(
              `${path}:array_compact_lf`,
              `${compact}
`,
            );


            diagnosticAddNestedCandidate(
              `${path}:array_pretty_2`,
              pretty,
            );

          }


          value
            .slice(
              0,
              12,
            )
            .forEach(
              (
                nestedValue,
                index,
              ) => {

                diagnosticVisitPayload(
                  nestedValue,
                  `${path}[${index}]`,
                  depth + 1,
                );

              },
            );

          return;

        }


        if(
          value
          &&
          typeof value === "object"
        ){

          const record =
            value as
              Record<
                string,
                unknown
              >;


          const keys =
            Object.keys(
              record,
            )
              .sort();


          const safeKeys =
            keys.map(
              diagnosticSafeKey,
            );


          diagnosticPayloadShape.push(
            `${path}:object{${safeKeys.join(",")}}`,
          );


          if(
            path !== "$"
          ){

            const compact =
              JSON.stringify(
                record,
              )
              ??
              "";


            const pretty =
              JSON.stringify(
                record,
                null,
                2,
              )
              ??
              "";


            diagnosticAddNestedCandidate(
              `${path}:object_compact`,
              compact,
            );


            diagnosticAddNestedCandidate(
              `${path}:object_compact_lf`,
              `${compact}
`,
            );


            diagnosticAddNestedCandidate(
              `${path}:object_pretty_2`,
              pretty,
            );

          }


          for(
            const key
            of keys.slice(
              0,
              40,
            )
          ){

            diagnosticVisitPayload(
              record[
                key
              ],
              `${path}.${diagnosticSafeKey(key)}`,
              depth + 1,
            );

          }


          return;

        }


        if(
          typeof value === "string"
        ){

          diagnosticPayloadShape.push(
            `${path}:string[length=${value.length}]`,
          );


          if(
            path !== "$"
            &&
            value
          ){

            diagnosticAddNestedCandidate(
              `${path}:string_raw`,
              value,
            );


            try{

              const parsed =
                JSON.parse(
                  value,
                ) as
                  unknown;


              if(
                parsed
                &&
                (
                  Array.isArray(
                    parsed,
                  )
                  ||
                  typeof parsed === "object"
                )
              ){

                const compact =
                  JSON.stringify(
                    parsed,
                  )
                  ??
                  "";


                diagnosticAddNestedCandidate(
                  `${path}:string_json_compact`,
                  compact,
                );


                diagnosticAddNestedCandidate(
                  `${path}:string_json_compact_lf`,
                  `${compact}
`,
                );

              }

            }catch{

              // The string is not embedded JSON.

            }

          }


          return;

        }


        diagnosticPayloadShape.push(
          `${path}:${typeof value}`,
        );

      };


    diagnosticVisitPayload(
      input.payload,
      "$",
      0,
    );


    const diagnosticPayloadTopLevelKeys =
      diagnosticPayloadRecord
        ? Object.keys(
            diagnosticPayloadRecord,
          )
            .sort()
            .map(
              diagnosticSafeKey,
            )
        : [];


    const diagnosticMatchingNestedPayloadVariants =
      diagnosticNestedPayloadCandidates
        .filter(
          (
            [
              ,
              candidatePayload,
            ],
          ) =>
            createHmac(
              "sha256",
              this.hitPayWebhookSalt(),
            )
              .update(
                candidatePayload,
              )
              .digest(
                "hex",
              )
            ===
            diagnosticSignature,
        )
        .map(
          (
            [
              candidateName,
            ],
          ) =>
            candidateName,
        );


    this.app.log.warn(
      {
        hitpayWebhookSignatureDiagnostic:{
          environment:
            env.HITPAY_ENVIRONMENT,

          businessIdPresent:
            Boolean(
              diagnosticBusinessId,
            ),

          businessIdFingerprint:
            diagnosticBusinessId
              ? createHash(
                  "sha256",
                )
                  .update(
                    diagnosticBusinessId,
                  )
                  .digest(
                    "hex",
                  )
                  .slice(
                    0,
                    12,
                  )
              : null,

          payloadIdPresent:
            Boolean(
              diagnosticPayloadId,
            ),

          payloadIdFingerprint:
            diagnosticPayloadId
              ? createHash(
                  "sha256",
                )
                  .update(
                    diagnosticPayloadId,
                  )
                  .digest(
                    "hex",
                  )
                  .slice(
                    0,
                    12,
                  )
              : null,

          recurringBillingIdPresent:
            Boolean(
              diagnosticRecurringBillingId,
            ),

          recurringBillingIdFingerprint:
            diagnosticRecurringBillingId
              ? createHash(
                  "sha256",
                )
                  .update(
                    diagnosticRecurringBillingId,
                  )
                  .digest(
                    "hex",
                  )
                  .slice(
                    0,
                    12,
                  )
              : null,

          recurringPlanIdPresent:
            Boolean(
              diagnosticRecurringPlanId,
            ),

          recurringPlanIdFingerprint:
            diagnosticRecurringPlanId
              ? createHash(
                  "sha256",
                )
                  .update(
                    diagnosticRecurringPlanId,
                  )
                  .digest(
                    "hex",
                  )
                  .slice(
                    0,
                    12,
                  )
              : null,

          recurringPlanEnvironmentMatches:
            diagnosticRecurringPlanEnvironmentMatches,

          recurringReferencePresent:
            Boolean(
              diagnosticRecurringReference,
            ),

          recurringReferenceFingerprint:
            diagnosticRecurringReference
              ? createHash(
                  "sha256",
                )
                  .update(
                    diagnosticRecurringReference,
                  )
                  .digest(
                    "hex",
                  )
                  .slice(
                    0,
                    12,
                  )
              : null,

          affectedMethodIdPresent:
            Boolean(
              diagnosticAffectedMethodId,
            ),

          affectedMethodIdFingerprint:
            diagnosticAffectedMethodId
              ? createHash(
                  "sha256",
                )
                  .update(
                    diagnosticAffectedMethodId,
                  )
                  .digest(
                    "hex",
                  )
                  .slice(
                    0,
                    12,
                  )
              : null,

          signaturePresent:
            Boolean(
              diagnosticSignature,
            ),

          signatureLength:
            diagnosticSignature.length,

          signatureFormatValid:
            /^[a-f0-9]{64}$/.test(
              diagnosticSignature,
            ),

          signaturesMatchCurrentFormula:
            diagnosticSignature
            ===
            diagnosticExpectedSignature,

          matchingPayloadVariants:
            diagnosticMatchingPayloadVariants,

          matchingKeyVariants:
            diagnosticMatchingKeyVariants,

          matchingNestedPayloadVariants:
            diagnosticMatchingNestedPayloadVariants,

          payloadTopLevelKeys:
            diagnosticPayloadTopLevelKeys,

          payloadShape:
            diagnosticPayloadShape,

          nestedPayloadCandidateCount:
            diagnosticNestedPayloadCandidates
              .length,

          rawBodyStartsWithUtf8Bom:
            input.rawBody.length >= 3
            &&
            input.rawBody[0] === 0xef
            &&
            input.rawBody[1] === 0xbb
            &&
            input.rawBody[2] === 0xbf,

          rawBodyEndsWithLf:
            diagnosticRawBodyText
              .endsWith(
                "\n",
              ),

          rawBodyEndsWithCrLf:
            diagnosticRawBodyText
              .endsWith(
                "\r\n",
              ),

          signatureFingerprint:
            diagnosticSignature
              ? createHash(
                  "sha256",
                )
                  .update(
                    diagnosticSignature,
                  )
                  .digest(
                    "hex",
                  )
                  .slice(
                    0,
                    12,
                  )
              : null,

          expectedFingerprint:
            createHash(
              "sha256",
            )
              .update(
                diagnosticExpectedSignature,
              )
              .digest(
                "hex",
              )
              .slice(
                0,
                12,
              ),

          rawBodyLength:
            input.rawBody.length,

          rawBodyFingerprint:
            createHash(
              "sha256",
            )
              .update(
                input.rawBody,
              )
              .digest(
                "hex",
              )
              .slice(
                0,
                12,
              ),

          saltFingerprint:
            createHash(
              "sha256",
            )
              .update(
                this.hitPayWebhookSalt(),
              )
              .digest(
                "hex",
              )
              .slice(
                0,
                12,
              ),
        },
      },
      "HitPay webhook signature diagnostic",
    );


    this.assertWebhookSignature(
      input.rawBody,
      input.signature,
    );


    const eventObject =
      input.eventObject
        .trim()
        .toLowerCase();


    const eventType =
      input.eventType
        .trim()
        .toLowerCase();


    if(
      !eventObject
      ||
      !eventType
    ){

      throw new AppError(
        "HITPAY_WEBHOOK_HEADERS_MISSING",
        "HitPay webhook headers are missing",
        400,
      );

    }


    const payload =
      this.isRecord(
        input.payload,
      )
        ? input.payload
        : {
          value:
            input.payload
            ??
            null,
        };


    const eventKey =
      createHash(
        "sha256",
      )
        .update(
          eventObject,
        )
        .update(
          "\n",
        )
        .update(
          eventType,
        )
        .update(
          "\n",
        )
        .update(
          input.rawBody,
        )
        .digest(
          "hex",
        );


    const externalId =
      this.stringValue(
        payload.id,
      );


    const existingByEventKey =
      await this.app.prisma
        .billingWebhookEvent
        .findUnique({
          where:{
            eventKey,
          },
        });


    const existing =
      existingByEventKey
      ??
      (
        externalId
          ? await this.app.prisma
              .billingWebhookEvent
              .findFirst({
                where:{
                  provider:
                    "HITPAY",

                  externalId,

                  eventObject,

                  eventType,

                  status:
                    "RECEIVED_UNMAPPED",

                  workspaceBillingSubscriptionId:
                    null,
                },

                orderBy:{
                  createdAt:
                    "desc",
                },
              })
          : null
      );


    const billingSubscription =
      await this.findWebhookBilling(
        payload,
        eventObject,
      );


    let event =
      existing;


    let recoveredDuplicate =
      false;


    if(existing){

      if(
        existing.status
          === "RECEIVED_UNMAPPED"
        &&
        !existing
          .workspaceBillingSubscriptionId
        &&
        billingSubscription
      ){

        event =
          await this.app.prisma
            .billingWebhookEvent
            .update({
              where:{
                id:
                  existing.id,
              },

              data:{
                workspaceBillingSubscriptionId:
                  billingSubscription.id,

                status:
                  "RECEIVED_MAPPED",

                errorMessage:
                  null,
              },
            });


        recoveredDuplicate =
          true;

      }else{

        return {
          received:
            true,

          duplicate:
            true,

          mapped:
            Boolean(
              existing
                .workspaceBillingSubscriptionId,
            ),

          eventId:
            existing.id,

          activationPerformed:
            false,
        };

      }

    }else{


      event =
        await this.app.prisma
          .billingWebhookEvent
          .create({
            data:{
              workspaceBillingSubscriptionId:
                billingSubscription?.id
                ??
                null,

              provider:
                "HITPAY",

              eventKey,

              signature:
                input.signature,

              eventObject,

              eventType,

              externalId:
                externalId
                ||
                null,

              status:
                billingSubscription
                  ? "RECEIVED_MAPPED"
                  : "RECEIVED_UNMAPPED",

              payload:
                payload as Prisma.InputJsonValue,
            },
          });

    }


    if(!billingSubscription){

      return {
        received:
          true,

        duplicate:
          recoveredDuplicate,

        mapped:
          false,

        eventId:
          event.id,

        activationPerformed:
          false,
      };

    }


    const nestedRecurringBilling =
      this.isRecord(
        payload.recurring_billing,
      )
        ? payload.recurring_billing
        : null;


    const payloadStatus =
      this.firstString(
        payload.status,
        nestedRecurringBilling?.status,
      )
        .toLowerCase();


    const successfulPayment =
      (
        (
          eventObject === "charge"
          &&
          eventType === "created"
        )
        ||
        (
          eventObject === "payment_request"
          &&
          eventType === "completed"
        )
      )
      &&
      [
        "succeeded",
        "completed",
        "paid",
        "success",
      ].includes(
        payloadStatus,
      );


    const failedPayment =
      (
        eventObject === "charge"
        &&
        eventType === "failed"
      )
      ||
      (
        eventObject === "payment_request"
        &&
        eventType === "failed"
      )
      ||
      [
        "failed",
        "declined",
      ].includes(
        payloadStatus,
      );


    const methodAttached =
      eventObject === "recurring_billing"
      &&
      eventType === "method_attached";


    const methodDetached =
      eventObject === "recurring_billing"
      &&
      eventType === "method_detached";


    const subscriptionUpdated =
      eventObject === "recurring_billing"
      &&
      eventType === "subscription_updated";


    let activationPerformed =
      false;

    let activatedRootFolderPlan:
      PaidBillingPlan
      |
      null =
        null;


    try{

      await this.app.prisma
        .$transaction(
          async (
            transaction,
          ) => {

            const processedAt =
              new Date();


            if(successfulPayment){

              const currentPlan =
                billingSubscription.plan as
                  PaidBillingPlan;


              const pendingPlan =
                billingSubscription.pendingPlan as
                  PaidBillingPlan
                  |
                  null;


              const currentConfiguration =
                PLAN_CONFIGURATION[
                  currentPlan
                ];


              const pendingConfiguration =
                pendingPlan
                  ? PLAN_CONFIGURATION[
                      pendingPlan
                    ]
                  : null;


              if(!currentConfiguration){

                throw new AppError(
                  "BILLING_PLAN_INVALID",
                  "Billing plan configuration is invalid",
                  500,
                );

              }


              const paidAmount =
                this.numberValue(
                  payload.amount,
                );


              const paidCurrency =
                this.firstString(
                  payload.currency,
                  payload.home_currency,
                )
                  .toUpperCase();


              const paidAmountInCents =
                paidAmount === null
                  ? null
                  : Math.round(
                      paidAmount
                      *
                      100,
                    );


              const currentAmountMatches =
                paidAmountInCents
                  ===
                Math.round(
                  currentConfiguration.amount
                  *
                  100,
                );


              const pendingAmountMatches =
                Boolean(
                  pendingPlan
                  &&
                  pendingConfiguration
                  &&
                  paidAmountInCents
                    ===
                  Math.round(
                    pendingConfiguration.amount
                    *
                    100,
                  ),
                );


              const pendingUpgradeBalance =
                pendingConfiguration
                  ? Math.max(
                      0,
                      pendingConfiguration.amount
                      -
                      currentConfiguration.amount,
                    )
                  : 0;


              const pendingUpgradeMatches =
                Boolean(
                  pendingPlan
                  &&
                  pendingConfiguration
                  &&
                  pendingUpgradeBalance > 0
                  &&
                  paidAmountInCents
                    ===
                  Math.round(
                    pendingUpgradeBalance
                    *
                    100,
                  ),
                );


              if(
                paidAmount === null
                ||
                paidCurrency !== "MYR"
                ||
                (
                  !currentAmountMatches
                  &&
                  !pendingAmountMatches
                  &&
                  !pendingUpgradeMatches
                )
              ){

                throw new AppError(
                  "HITPAY_PAYMENT_MISMATCH",
                  "HitPay payment amount or currency does not match the billing plan",
                  400,
                );

              }


              const activatePendingPlan =
                Boolean(
                  pendingPlan
                  &&
                  pendingConfiguration
                  &&
                  (
                    pendingAmountMatches
                    ||
                    pendingUpgradeMatches
                  ),
                );


              const activatedPlan =
                activatePendingPlan
                  ? pendingPlan!
                  : currentPlan;


              const activatedConfiguration =
                activatePendingPlan
                  ? pendingConfiguration!
                  : currentConfiguration;


              const paymentAt =
                this.webhookDate(
                  payload.closed_at,
                  payload.created_at,
                  payload.updated_at,
                )
                ??
                processedAt;


              const preservePaidPeriod =
                Boolean(
                  pendingUpgradeMatches
                  &&
                  billingSubscription
                    .currentPeriodStart
                  &&
                  billingSubscription
                    .currentPeriodEnd,
                );


              const currentPeriodStart =
                preservePaidPeriod
                  ? billingSubscription
                      .currentPeriodStart!
                  : paymentAt;


              const currentPeriodEnd =
                preservePaidPeriod
                  ? billingSubscription
                      .currentPeriodEnd!
                  : this.addMonths(
                      paymentAt,
                      1,
                    );


              await transaction
                .workspaceBillingSubscription
                .update({
                  where:{
                    id:
                      billingSubscription.id,
                  },

                  data:{
                    plan:
                      activatedPlan,

                    providerPlanId:
                      activatePendingPlan
                        ? (
                          billingSubscription
                            .pendingProviderPlanId
                          ??
                          activatedConfiguration
                            .providerPlanId
                        )
                        : billingSubscription
                            .providerPlanId,

                    pendingPlan:
                      activatePendingPlan
                        ? null
                        : billingSubscription
                            .pendingPlan,

                    pendingProviderPlanId:
                      activatePendingPlan
                        ? null
                        : billingSubscription
                            .pendingProviderPlanId,

                    planChangeRequestedAt:
                      activatePendingPlan
                        ? null
                        : billingSubscription
                            .planChangeRequestedAt,

                    status:
                      "ACTIVE",

                    lastPaymentAt:
                      paymentAt,

                    lastPaymentStatus:
                      "SUCCEEDED",

                    currentPeriodStart:
                      currentPeriodStart,

                    currentPeriodEnd,

                    canceledAt:
                      null,

                    lastWebhookAt:
                      processedAt,
                  },
                });


              await transaction
                .subscription
                .upsert({
                  where:{
                    userId:
                      billingSubscription
                        .ownerUserId,
                  },

                  create:{
                    userId:
                      billingSubscription
                        .ownerUserId,

                    plan:
                      activatedPlan,

                    status:
                      "ACTIVE",

                    expiresAt:
                      currentPeriodEnd,
                  },

                  update:{
                    plan:
                      activatedPlan,

                    status:
                      "ACTIVE",

                    expiresAt:
                      currentPeriodEnd,
                  },
                });


              await transaction
                .workspace
                .update({
                  where:{
                    id:
                      billingSubscription
                        .workspaceId,
                  },

                  data:{
                    type:
                      this.workspaceTypeForPlan(
                        activatedPlan,
                      ),
                  },
                });


              activationPerformed =
                true;

              activatedRootFolderPlan =
                activatedPlan;

            }else if(failedPayment){

              await transaction
                .workspaceBillingSubscription
                .update({
                  where:{
                    id:
                      billingSubscription.id,
                  },

                  data:{
                    status:
                      "RETRYING",

                    lastPaymentStatus:
                      "FAILED",

                    lastWebhookAt:
                      processedAt,
                  },
                });

            }else if(methodAttached){

              await transaction
                .workspaceBillingSubscription
                .update({
                  where:{
                    id:
                      billingSubscription.id,
                  },

                  data:{
                    status:
                      "SCHEDULED",

                    lastWebhookAt:
                      processedAt,
                  },
                });

            }else if(methodDetached){

              await transaction
                .workspaceBillingSubscription
                .update({
                  where:{
                    id:
                      billingSubscription.id,
                  },

                  data:{
                    status:
                      "RETRYING",

                    lastWebhookAt:
                      processedAt,
                  },
                });

            }else if(subscriptionUpdated){

              const providerStatus =
                payloadStatus === "cancelled"
                  ? "canceled"
                  : payloadStatus;


              const billingStatus =
                (
                  {
                    active:
                      "ACTIVE",

                    scheduled:
                      "SCHEDULED",

                    retrying:
                      "RETRYING",

                    paused:
                      "PAUSED",

                    inactive:
                      "INACTIVE",

                    canceled:
                      "CANCELED",

                    expired:
                      "EXPIRED",
                  } as Record<
                    string,
                    string
                  >
                )[
                  providerStatus
                ]
                ??
                "PENDING";


              await transaction
                .workspaceBillingSubscription
                .update({
                  where:{
                    id:
                      billingSubscription.id,
                  },

                  data:{
                    status:
                      billingStatus,

                    canceledAt:
                      providerStatus === "canceled"
                        ? processedAt
                        : billingSubscription
                            .canceledAt,

                    lastWebhookAt:
                      processedAt,
                  },
                });


              if(
                providerStatus === "inactive"
                ||
                providerStatus === "expired"
              ){

                await transaction
                  .subscription
                  .updateMany({
                    where:{
                      userId:
                        billingSubscription
                          .ownerUserId,
                    },

                    data:{
                      status:
                        "INACTIVE",
                    },
                  });

              }

            }else{

              await transaction
                .workspaceBillingSubscription
                .update({
                  where:{
                    id:
                      billingSubscription.id,
                  },

                  data:{
                    lastWebhookAt:
                      processedAt,
                  },
                });

            }


            await transaction
              .billingWebhookEvent
              .update({
                where:{
                  id:
                    event.id,
                },

                data:{
                  status:
                    activationPerformed
                      ? "PROCESSED_ACTIVATED"
                      : (
                        successfulPayment
                        ||
                        failedPayment
                        ||
                        methodAttached
                        ||
                        methodDetached
                        ||
                        subscriptionUpdated
                      )
                        ? "PROCESSED"
                        : "IGNORED",

                  processedAt,

                  errorMessage:
                    null,
                },
              });

          },
        );


      if(activatedRootFolderPlan){
        try{
          await this.renameAutoCreatedRootFolder({
            workspaceId:
              billingSubscription
                .workspaceId,
            plan:
              activatedRootFolderPlan,
          });
        }catch(error){
          this.app.log.warn(
            {
              err:
                error,
              workspaceId:
                billingSubscription
                  .workspaceId,
              plan:
                activatedRootFolderPlan,
            },
            "Google Drive root folder rename will be retried on a later billing event",
          );
        }
      }

    }catch(error){

      const message =
        error instanceof Error
          ? error.message
          : "Unknown webhook processing error";


      await this.app.prisma
        .billingWebhookEvent
        .update({
          where:{
            id:
              event.id,
          },

          data:{
            status:
              "ERROR",

            processedAt:
              new Date(),

            errorMessage:
              message.slice(
                0,
                1000,
              ),
          },
        });


      throw error;

    }


    return {
      received:
        true,

      duplicate:
        recoveredDuplicate,

      mapped:
        true,

      eventId:
        event.id,

      activationPerformed,
    };

  }


  private async findMembership(
    userId:string,
    workspaceId:string,
  ){

    const membership =
      await this.app.prisma
        .workspaceMember
        .findUnique({
          where:{
            userId_workspaceId:{
              userId,
              workspaceId,
            },
          },

          include:{
            user:{
              include:{
                subscription:
                  true,
              },
            },

            workspace:{
              include:{
                billingSubscription:
                  true,
              },
            },
          },
        });


    if(!membership){

      throw new AppError(
        "BILLING_MEMBERSHIP_NOT_FOUND",
        "Workspace membership not found",
        404,
      );

    }


    return membership;

  }


  private async findWebhookBilling(
    payload:JsonRecord,
    eventObject:string,
  ){

    const nestedRecurringBilling =
      this.isRecord(
        payload.recurring_billing,
      )
        ? payload.recurring_billing
        : null;


    const nestedPaymentRequest =
      this.isRecord(
        payload.payment_request,
      )
        ? payload.payment_request
        : null;


    const nestedCustomer =
      this.isRecord(
        payload.customer,
      )
        ? payload.customer
        : null;


    const nestedRelatable =
      this.isRecord(
        payload.relatable,
      )
        ? payload.relatable
        : null;


    const nestedBusinessCharge =
      this.isRecord(
        nestedRelatable
          ?.business_charge,
      )
        ? nestedRelatable
          .business_charge
        : null;


    const providerSubscriptionId =
      this.firstString(
        payload.recurring_billing_id,
        payload.recurringBillingId,
        payload.subscription_id,
        payload.subscriptionId,
        nestedRecurringBilling?.id,
        nestedPaymentRequest
          ?.recurring_billing_id,
        nestedBusinessCharge?.id,
        eventObject.startsWith(
          "recurring_billing",
        )
          ? payload.id
          : null,
      );


    if(providerSubscriptionId){

      const billing =
        await this.app.prisma
          .workspaceBillingSubscription
          .findUnique({
            where:{
              providerSubscriptionId,
            },
          });


      if(billing){

        return billing;

      }

    }


    const reference =
      this.firstString(
        payload.reference,
        payload.reference_number,
        payload.referenceNumber,
        nestedRecurringBilling?.reference,
        nestedPaymentRequest?.reference,
        nestedPaymentRequest
          ?.reference_number,
        nestedBusinessCharge
          ?.reference,
      );


    if(reference){

      const billing =
        await this.app.prisma
          .workspaceBillingSubscription
          .findUnique({
            where:{
              checkoutReference:
                reference,
            },
          });


      if(billing){

        return billing;

      }

    }


    const customerEmail =
      this.firstString(
        payload.customer_email,
        nestedCustomer?.email,
        nestedRecurringBilling
          ?.customer_email,
        nestedPaymentRequest
          ?.customer_email,
        nestedBusinessCharge
          ?.customer_email,
      )
        .toLowerCase();


    if(!customerEmail){

      return null;

    }


    const owner =
      await this.app.prisma
        .user
        .findUnique({
          where:{
            email:
              customerEmail,
          },

          select:{
            id:
              true,
          },
        });


    if(!owner){

      return null;

    }


    const candidates =
      await this.app.prisma
        .workspaceBillingSubscription
        .findMany({
          where:{
            ownerUserId:
              owner.id,

            status:{
              in:[
                "CHECKOUT_PENDING",
                "SCHEDULED",
                "PENDING",
                "ACTIVE",
                "RETRYING",
                "PLAN_CHANGE_PAYMENT_PENDING",
                "PLAN_CHANGE_REVIEW_REQUIRED",
              ],
            },
          },

          orderBy:{
            updatedAt:
              "desc",
          },

          take:
            10,
        });


    const amount =
      this.numberValue(
        payload.amount,
      );


    const matchingCandidates =
      amount === null
        ? candidates
        : candidates.filter(
          (
            candidate,
          ) => {

            const configuration =
              PLAN_CONFIGURATION[
                candidate.plan as
                  PaidBillingPlan
              ];


            const pendingConfiguration =
              candidate.pendingPlan
                ? PLAN_CONFIGURATION[
                    candidate.pendingPlan as
                      PaidBillingPlan
                  ]
                : null;


            const amountInCents =
              Math.round(
                amount
                *
                100,
              );


            const acceptedAmounts =
              configuration
                ? [
                    configuration.amount,
                    ...(
                      pendingConfiguration
                        ? [
                            pendingConfiguration
                              .amount,
                            Math.max(
                              0,
                              pendingConfiguration
                                .amount
                              -
                              configuration.amount,
                            ),
                          ]
                        : []
                    ),
                  ]
                : [];


            return acceptedAmounts.some(
              (
                acceptedAmount,
              ) =>
                Math.round(
                  acceptedAmount
                  *
                  100,
                )
                ===
                amountInCents,
            );

          },
        );


    return matchingCandidates.length === 1
      ? matchingCandidates[0]
      : null;

  }



  private async renameWorkspaceRootFolder(
    input:AutoCreatedRootFolderRenameInput,
  ){
    const workspace =
      await this.app.prisma
        .workspace
        .findUnique({
          where:{
            id:
              input.workspaceId,
          },
          select:{
            owner:{
              select:{
                email:
                  true,
              },
            },
            googleSetting:{
              select:{
                mode:
                  true,
                rootFolderId:
                  true,
              },
            },
          },
        });

    if(
      workspace
        ?.googleSetting
        ?.mode !== "AUTO_CREATED"
      ||
      !workspace.googleSetting.rootFolderId
    ){
      return;
    }

    const drive =
      new GoogleDriveService(
        this.app,
      );

    await drive.renameFile(
      input.workspaceId,
      workspace.googleSetting.rootFolderId,
      buildMyPocketRootFolderName(
        input.plan,
        workspace.owner.email,
      ),
    );
  }


  private hitPayWebhookSalt(){

    return env.HITPAY_WEBHOOK_SALT
      ?? env.HITPAY_SALT;

  }


  private assertWebhookSignature(
    rawBody:Buffer,
    signature:string,
  ){

    const normalized =
      signature
        .trim()
        .toLowerCase()
        .replace(
          /^sha256=/,
          "",
        );


    if(
      !/^[a-f0-9]{64}$/.test(
        normalized,
      )
    ){

      throw new AppError(
        "HITPAY_SIGNATURE_INVALID",
        "Invalid HitPay webhook signature",
        401,
      );

    }


    const expected =
      createHmac(
        "sha256",
        this.hitPayWebhookSalt(),
      )
        .update(
          rawBody,
        )
        .digest();


    const received =
      Buffer.from(
        normalized,
        "hex",
      );


    if(
      expected.length
        !== received.length
      ||
      !timingSafeEqual(
        expected,
        received,
      )
    ){

      throw new AppError(
        "HITPAY_SIGNATURE_INVALID",
        "Invalid HitPay webhook signature",
        401,
      );

    }

  }


  private workspaceTypeForPlan(
    plan:PaidBillingPlan,
  ):
    "PERSONAL"
    |
    "FAMILY"
    |
    "BUSINESS"
  {

    if(plan === "FAMILY"){
      return "FAMILY";
    }


    if(plan === "BUSINESS"){
      return "BUSINESS";
    }


    return "PERSONAL";

  }


  private webhookDate(
    ...values:unknown[]
  ){

    for(
      const value
      of values
    ){

      if(
        typeof value !== "string"
        ||
        !value.trim()
      ){
        continue;
      }


      const date =
        new Date(
          value,
        );


      if(
        !Number.isNaN(
          date.getTime(),
        )
      ){
        return date;
      }

    }


    return null;

  }


  private numberValue(
    value:unknown,
  ){

    if(
      typeof value === "number"
      &&
      Number.isFinite(
        value,
      )
    ){
      return value;
    }


    if(
      typeof value === "string"
      &&
      value.trim()
    ){

      const parsed =
        Number(
          value,
        );


      if(
        Number.isFinite(
          parsed,
        )
      ){
        return parsed;
      }

    }


    return null;

  }


  private addMonths(
    date:Date,
    months:number,
  ){

    const result =
      new Date(
        date,
      );


    result.setUTCMonth(
      result.getUTCMonth()
      +
      months,
    );


    return result;

  }


  private singaporeDate(
    date:Date,
  ){

    const parts =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            "Asia/Singapore",

          year:
            "numeric",

          month:
            "2-digit",

          day:
            "2-digit",
        },
      )
        .formatToParts(
          date,
        );


    const values =
      Object.fromEntries(
        parts.map(
          (part) => [
            part.type,
            part.value,
          ],
        ),
      );


    return [
      values.year,
      values.month,
      values.day,
    ].join(
      "-",
    );

  }


  private firstString(
    ...values:unknown[]
  ){

    for(
      const value
      of values
    ){

      const normalized =
        this.stringValue(
          value,
        );


      if(normalized){

        return normalized;

      }

    }


    return "";

  }


  private stringValue(
    value:unknown,
  ){

    return typeof value === "string"
      ? value.trim()
      : "";

  }


  private isRecord(
    value:unknown,
  ):value is JsonRecord {

    return Boolean(
      value
      &&
      typeof value === "object"
      &&
      !Array.isArray(
        value,
      ),
    );

  }


}
