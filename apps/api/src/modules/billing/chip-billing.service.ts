import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { env } from "../../config/index.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../shared/errors/app-error.js";
import { PromotionService } from "../promotion/promotion.service.js";
import {
  buildRenewalSchedule,
  calculateProratedUpgrade,
  classifyPlanChange,
  computePlanQuote,
  getGraceDays,
  type BillingPlan,
} from "./billing-plan.policy.js";
import { assertBillingProviderCallAllowed } from "./billing-provider.policy.js";
import type {
  ChipCheckoutInput,
  ChipPaymentMethodsQuery,
} from "./chip-billing.schemas.js";
import { ChipClient, type ChipPurchase } from "./chip.client.js";
import {
  chipWebhookEventKey,
  chipWebhookObjectType,
  chipWebhookPurchaseId,
  parseChipWebhookPayload,
  verifyChipWebhookSignature,
} from "./chip-webhook.js";

type SessionActor = {
  userId: string;
  workspaceId: string;
  email: string;
};

type ChipBillingDependencies = {
  client?: ChipClient;
};

const ACTIVE_ATTEMPT_STATUSES = ["CREATED", "PENDING"] as const;

export class ChipBillingService {
  constructor(
    private readonly app: FastifyInstance,
    private readonly dependencies: ChipBillingDependencies = {},
  ) {}

  async getQuote(actor: SessionActor, input: ChipPaymentMethodsQuery) {
    await this.assertOwner(actor);
    const quote = await this.quote(input.plan, input.interval);
    const promotion = input.promoCode
      ? await new PromotionService(this.app).quoteForCheckout(actor, {
          code:input.promoCode,
          plan:input.plan,
          originalAmount:quote.amountDueSen / 100,
          currency:"MYR",
          paymentMethodAttached:input.renewalMethod === "AUTOMATIC",
        })
      : null;

    return {
      ...quote,
      ...(promotion
        ? {
            amountDueSen:Math.round(promotion.disclosure.firstChargeAmount * 100),
            promotion,
          }
        : {}),
      renewalMethod: input.renewalMethod,
      currency: "MYR" as const,
    };
  }

  async getPaymentMethods(actor: SessionActor, input: ChipPaymentMethodsQuery) {
    assertBillingProviderCallAllowed(env.BILLING_CHECKOUT_PROVIDER, "chip");
    await this.assertOwner(actor);
    const quote = await this.quote(input.plan, input.interval);
    const promotion = input.promoCode
      ? await new PromotionService(this.app).quoteForCheckout(actor, {
          code:input.promoCode,
          plan:input.plan,
          originalAmount:quote.amountDueSen / 100,
          currency:"MYR",
          paymentMethodAttached:input.renewalMethod === "AUTOMATIC",
        })
      : null;
    const amountDueSen = promotion
      ? Math.round(promotion.disclosure.firstChargeAmount * 100)
      : quote.amountDueSen;
    const isPreauthorization = Boolean(
      promotion
      && amountDueSen === 0
      && promotion.disclosure.requiresPaymentMethod,
    );
    const response = await this.client().listPaymentMethods({
      brandId: this.requiredEnvironment("CHIP_BRAND_ID", env.CHIP_BRAND_ID),
      amountSen: amountDueSen,
      recurring: input.renewalMethod === "AUTOMATIC",
      preauthorization:isPreauthorization || undefined,
    });

    const available = Array.isArray(response.available_payment_methods)
      ? response.available_payment_methods.filter(
          (method): method is string =>
            typeof method === "string" && /^[a-z0-9_]+$/u.test(method),
        )
      : [];

    return {
      available,
      names: response.names ?? {},
      cardMethods: response.card_methods ?? [],
      quote:{
        ...quote,
        amountDueSen,
        ...(promotion ? { promotion } : {}),
      },
    };
  }

  async createCheckout(actor: SessionActor, input: ChipCheckoutInput) {
    assertBillingProviderCallAllowed(env.BILLING_CHECKOUT_PROVIDER, "chip");
    const membership = await this.assertOwner(actor);
    await this.assertPlanAllowed(actor.userId, input.plan);

    const currentBilling = membership.workspace.billingSubscription;
    const currentPlan = this.paidPlan(
      membership.user.subscription?.status === "ACTIVE"
        ? membership.user.subscription.plan
        : currentBilling?.plan,
    );
    const planChange = currentPlan
      ? classifyPlanChange(currentPlan, input.plan)
      : "NEW";

    if (planChange === "DOWNGRADE" && currentBilling) {
      const effectiveAt =
        currentBilling.paidThroughAt ?? currentBilling.currentPeriodEnd;
      if (!effectiveAt || effectiveAt <= new Date()) {
        throw new AppError(
          "BILLING_DOWNGRADE_PERIOD_MISSING",
          "The current paid period is unavailable. Refresh billing status first.",
          409,
        );
      }
      await this.app.prisma.workspaceBillingSubscription.update({
        where: { id: currentBilling.id },
        data: {
          pendingPlan: input.plan,
          pendingProviderPlanId: this.providerPlanId(input.plan, input.interval),
          planChangeRequestedAt: new Date(),
          billingInterval: input.interval,
          renewalMethod: input.renewalMethod,
          autoRenewEnabled: input.renewalMethod === "AUTOMATIC",
          cancelAtPeriodEnd: false,
        },
      });
      return {
        provider: "CHIP" as const,
        scheduled: true,
        plan: input.plan,
        interval: input.interval,
        renewalMethod: input.renewalMethod,
        effectiveAt,
      };
    }

    const settings = await this.settings();
    const fullQuote = computePlanQuote({
      plan: input.plan,
      interval: input.interval,
      annualDiscountPercent: String(settings.annualDiscountPercent),
    });
    const now = new Date();
    let amountDueSen = fullQuote.amountDueSen;
    let promotionQuote: Awaited<ReturnType<PromotionService["quoteForCheckout"]>> | null = null;
    let coverageStart: Date;
    let coverageEnd: Date;
    let attemptType = "NEW";

    if (planChange === "UPGRADE" && currentBilling && currentPlan) {
      const periodStart = currentBilling.currentPeriodStart;
      const periodEnd = currentBilling.paidThroughAt ?? currentBilling.currentPeriodEnd;
      if (!periodStart || !periodEnd) {
        throw new AppError(
          "BILLING_UPGRADE_PERIOD_MISSING",
          "The current paid period is unavailable. Refresh billing status first.",
          409,
        );
      }
      amountDueSen = calculateProratedUpgrade({
        currentPlan,
        targetPlan: input.plan,
        interval: currentBilling.billingInterval,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        now,
        annualDiscountPercent: String(settings.annualDiscountPercent),
      });
      coverageStart = periodStart;
      coverageEnd = periodEnd;
      attemptType = "UPGRADE";
    } else {
      const schedule = buildRenewalSchedule({
        paidAt: now,
        paidThroughAt: currentBilling?.paidThroughAt ?? null,
        interval: input.interval,
        plan: input.plan,
      });
      coverageStart = schedule.coverageStart;
      coverageEnd = schedule.coverageEnd;
      attemptType = currentBilling?.accessState === "ACTIVE" ? "RENEWAL" : "NEW";
    }

    const promotionOriginalAmountSen = amountDueSen;
    if(input.promoCode){
      promotionQuote = await new PromotionService(this.app).quoteForCheckout(actor, {
        code:input.promoCode,
        plan:input.plan,
        originalAmount:amountDueSen / 100,
        currency:"MYR",
        paymentMethodAttached:input.renewalMethod === "AUTOMATIC",
      });
      amountDueSen = Math.round(promotionQuote.disclosure.firstChargeAmount * 100);
      if(promotionQuote.disclosure.trialEndsAt){
        coverageEnd = new Date(promotionQuote.disclosure.trialEndsAt);
      }
    }

    const isPreauthorization = Boolean(
      promotionQuote
      && amountDueSen === 0
      && promotionQuote.disclosure.requiresPaymentMethod,
    );
    if(isPreauthorization && input.renewalMethod !== "AUTOMATIC"){
      throw new AppError(
        "PROMO_AUTOMATIC_RENEWAL_REQUIRED",
        "This trial requires automatic renewal and a verified card.",
        409,
      );
    }
    if (amountDueSen <= 0 && !isPreauthorization) {
      throw new AppError(
        "BILLING_PAYMENT_AMOUNT_ZERO",
        "No immediate charge is due for this plan change.",
        409,
      );
    }

    const existingAttempt = currentBilling
      ? await this.app.prisma.billingPaymentAttempt.findFirst({
          where: {
            workspaceBillingSubscriptionId: currentBilling.id,
            provider: "CHIP",
            plan: input.plan,
            billingInterval: input.interval,
            renewalMethod: input.renewalMethod,
            status: { in: [...ACTIVE_ATTEMPT_STATUSES] },
            expiresAt: { gt: now },
            checkoutUrl: { not: null },
            promoRedemption: input.promoCode
              ? { is:{ campaign:{ code:input.promoCode } } }
              : { is:null },
          },
          orderBy: { createdAt: "desc" },
        })
      : null;
    if (existingAttempt?.checkoutUrl) {
      return this.checkoutResponse(existingAttempt, true);
    }

    const methods = await this.client().listPaymentMethods({
      brandId: this.requiredEnvironment("CHIP_BRAND_ID", env.CHIP_BRAND_ID),
      amountSen: amountDueSen,
      recurring: input.renewalMethod === "AUTOMATIC",
      preauthorization:isPreauthorization || undefined,
    });
    const availableMethods = methods.available_payment_methods.filter(
      (method) => typeof method === "string" && /^[a-z0-9_]+$/u.test(method),
    );
    if (
      input.preferredPaymentMethod &&
      !availableMethods.includes(input.preferredPaymentMethod)
    ) {
      throw new AppError(
        "CHIP_PAYMENT_METHOD_UNAVAILABLE",
        "The selected payment method is unavailable for this billing option.",
        409,
      );
    }
    if (input.renewalMethod === "AUTOMATIC" && availableMethods.length === 0) {
      throw new AppError(
        "CHIP_RECURRING_METHOD_UNAVAILABLE",
        "No recurring payment method is currently available.",
        409,
      );
    }

    const reference = [
      "imai",
      actor.workspaceId.slice(0, 20),
      input.plan.toLowerCase(),
      Date.now(),
      randomUUID(),
    ].join("_").slice(0, 128);
    const idempotencyKey = input.requestId
      ? `chip:${actor.workspaceId}:${input.requestId}`
      : `chip:${actor.workspaceId}:${randomUUID()}`;
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1_000);
    const providerPlanId = this.providerPlanId(input.plan, input.interval);

    const prepared = await this.app.prisma.$transaction(async (tx) => {
      const subscription = await tx.workspaceBillingSubscription.upsert({
        where: { workspaceId: actor.workspaceId },
        create: {
          workspaceId: actor.workspaceId,
          ownerUserId: actor.userId,
          plan: input.plan,
          status: "CHECKOUT_PENDING",
          provider: "CHIP",
          providerPlanId,
          pendingPlan: attemptType === "UPGRADE" ? input.plan : null,
          pendingProviderPlanId: attemptType === "UPGRADE" ? providerPlanId : null,
          planChangeRequestedAt: attemptType === "UPGRADE" ? now : null,
          billingInterval: input.interval,
          renewalMethod: input.renewalMethod,
          accessState: currentBilling?.accessState ?? "PENDING",
          autoRenewEnabled: input.renewalMethod === "AUTOMATIC",
          paidThroughAt: currentBilling?.paidThroughAt,
          nextRenewalAt: currentBilling?.nextRenewalAt,
          paymentDueAt: currentBilling?.paymentDueAt,
          graceEndsAt: currentBilling?.graceEndsAt,
        },
        update: {
          ownerUserId: actor.userId,
          provider: "CHIP",
          providerPlanId,
          status: attemptType === "UPGRADE" ? "PLAN_CHANGE_PAYMENT_PENDING" : "CHECKOUT_PENDING",
          pendingPlan: attemptType === "UPGRADE" ? input.plan : null,
          pendingProviderPlanId: attemptType === "UPGRADE" ? providerPlanId : null,
          planChangeRequestedAt: attemptType === "UPGRADE" ? now : null,
          billingInterval: input.interval,
          renewalMethod: input.renewalMethod,
          autoRenewEnabled: input.renewalMethod === "AUTOMATIC",
        },
      });

      const attempt = await tx.billingPaymentAttempt.create({
        data: {
          workspaceBillingSubscriptionId: subscription.id,
          provider: "CHIP",
          idempotencyKey,
          reference,
          attemptType,
          status: "CREATED",
          plan: input.plan,
          billingInterval: input.interval,
          renewalMethod: input.renewalMethod,
          currency: "MYR",
          baseAmount: promotionOriginalAmountSen / 100,
          discountAmount:
            Math.max(0, promotionOriginalAmountSen - amountDueSen) / 100,
          amountDue: amountDueSen / 100,
          coverageStart,
          coverageEnd,
          expiresAt,
        },
      });
      const promoRedemption = input.promoCode && input.requestId
        ? await new PromotionService(this.app).reservePromotionForCheckout(tx, actor, {
            code:input.promoCode,
            plan:input.plan,
            originalAmount:promotionOriginalAmountSen / 100,
            currency:"MYR",
            paymentMethodAttached:true,
            requestId:input.requestId,
            billingPaymentAttemptId:attempt.id,
          })
        : null;
      return { subscription, attempt, promoRedemption };
    }, { isolationLevel: "Serializable" });

    let purchase: ChipPurchase;
    try {
      const returnUrl = this.requiredEnvironment("CHIP_RETURN_URL", env.CHIP_RETURN_URL);
      const webhookUrl = this.requiredEnvironment("CHIP_WEBHOOK_URL", env.CHIP_WEBHOOK_URL);
      const returnBase = returnUrl.includes("?") ? `${returnUrl}&` : `${returnUrl}?`;
      const paymentMethodWhitelist = input.preferredPaymentMethod
        ? [input.preferredPaymentMethod]
        : input.renewalMethod === "AUTOMATIC"
          ? availableMethods
          : undefined;

      purchase = await this.client().createPurchase({
        client: {
          email: membership.user.email,
          full_name: membership.user.name ?? undefined,
        },
        purchase: {
          currency: "MYR",
          products: [{
            name: `MyPocket ${this.displayPlan(input.plan)} ${this.displayInterval(input.interval)}`,
            price: amountDueSen,
            quantity: 1,
          }],
          metadata: {
            workspaceId: actor.workspaceId,
            paymentAttemptId: prepared.attempt.id,
            plan: input.plan,
            interval: input.interval,
            renewalMethod: input.renewalMethod,
            ...(prepared.promoRedemption
              ? {
                  promoRedemptionId:prepared.promoRedemption.id,
                  promoCode:input.promoCode ?? "",
                }
              : {}),
          },
        },
        brand_id: this.requiredEnvironment("CHIP_BRAND_ID", env.CHIP_BRAND_ID),
        reference,
        send_receipt: true,
        force_recurring: input.renewalMethod === "AUTOMATIC",
        ...(isPreauthorization ? { skip_capture:true } : {}),
        ...(paymentMethodWhitelist && paymentMethodWhitelist.length > 0
          ? { payment_method_whitelist: paymentMethodWhitelist }
          : {}),
        success_redirect: `${returnBase}billing=success&provider=chip`,
        failure_redirect: `${returnBase}billing=failure&provider=chip`,
        cancel_redirect: `${returnBase}billing=cancel&provider=chip`,
        success_callback: webhookUrl,
        creator_agent: "mypocket-ai",
        platform: "web",
      });
    } catch (error) {
      await this.app.prisma.$transaction(async (tx) => {
        await tx.billingPaymentAttempt.update({
          where: { id: prepared.attempt.id },
          data: {
            status: "FAILED",
            failedAt: new Date(),
            failureCode: error instanceof AppError ? error.code : "CHIP_CREATE_FAILED",
            failureMessage: "CHIP checkout could not be created.",
          },
        });
        await new PromotionService(this.app).cancelPromotionReservation(
          tx,
          prepared.attempt.id,
          "CHIP_CREATE_FAILED",
        );
      });
      throw error;
    }

    this.assertPurchaseEnvironment(purchase);
    if (!purchase.id || !purchase.checkout_url) {
      await this.app.prisma.$transaction(async (tx) => {
        await tx.billingPaymentAttempt.update({
          where:{ id:prepared.attempt.id },
          data:{
            status:"FAILED",
            failedAt:new Date(),
            failureCode:"CHIP_CHECKOUT_RESPONSE_INCOMPLETE",
            failureMessage:"CHIP returned an incomplete checkout response.",
          },
        });
        await new PromotionService(this.app).cancelPromotionReservation(
          tx,
          prepared.attempt.id,
          "CHIP_CHECKOUT_RESPONSE_INCOMPLETE",
        );
      });
      throw new AppError(
        "CHIP_CHECKOUT_RESPONSE_INCOMPLETE",
        "CHIP returned an incomplete checkout response.",
        502,
      );
    }

    const attempt = await this.app.prisma.$transaction(async (tx) => {
      const updated = await tx.billingPaymentAttempt.update({
        where: { id: prepared.attempt.id },
        data: {
          providerCheckoutId: purchase.id,
          status: "PENDING",
          checkoutUrl: purchase.checkout_url,
        },
      });
      await tx.workspaceBillingSubscription.update({
        where: { id: prepared.subscription.id },
        data: {
          providerSubscriptionId: null,
          checkoutReference: reference,
          checkoutUrl: purchase.checkout_url,
        },
      });
      return updated;
    });

    return this.checkoutResponse(attempt, false);
  }

  async cancelAutomaticRenewal(actor: SessionActor) {
    const membership = await this.assertOwner(actor);
    const subscription = membership.workspace.billingSubscription;
    if (!subscription) {
      throw new AppError(
        "BILLING_SUBSCRIPTION_NOT_FOUND",
        "An active billing subscription was not found.",
        404,
      );
    }
    if (subscription.cancelAtPeriodEnd) {
      return {
        canceled: true,
        reused: true,
        accessUntil: subscription.paidThroughAt ?? subscription.currentPeriodEnd,
      };
    }

    await this.app.prisma.$transaction(async (tx) => {
      await tx.workspaceBillingSubscription.update({
        where: { id: subscription.id },
        data: {
          autoRenewEnabled: false,
          cancelAtPeriodEnd: true,
          canceledAt: new Date(),
        },
      });
      await tx.billingRecurringToken.updateMany({
        where: {
          workspaceBillingSubscriptionId: subscription.id,
          status: "ACTIVE",
        },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
      await tx.billingRenewal.updateMany({
        where: {
          workspaceBillingSubscriptionId: subscription.id,
          status: { in: ["SCHEDULED", "INVOICED"] },
          dueAt: { gt: new Date() },
        },
        data: { status: "CANCELED", canceledAt: new Date() },
      });
    }, { isolationLevel: "Serializable" });

    return {
      canceled: true,
      reused: false,
      accessUntil: subscription.paidThroughAt ?? subscription.currentPeriodEnd,
    };
  }

  async createRenewalPayment(renewalId: string) {
    assertBillingProviderCallAllowed(env.BILLING_CHECKOUT_PROVIDER, "chip");
    const renewal = await this.app.prisma.billingRenewal.findUnique({
      where: { id: renewalId },
      include: {
        paymentAttempt: true,
        workspaceBillingSubscription: {
          include: {
            ownerUser: true,
            recurringTokens: {
              where: { provider: "CHIP", status: "ACTIVE" },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });
    if (!renewal) {
      throw new AppError(
        "BILLING_RENEWAL_NOT_FOUND",
        "Billing renewal was not found.",
        404,
      );
    }
    if (renewal.paymentAttempt) {
      return this.checkoutResponse(renewal.paymentAttempt, true);
    }

    const subscription = renewal.workspaceBillingSubscription;
    const reference = renewal.invoiceReference.slice(0, 128);
    const amountDueSen = Math.round(Number(renewal.amountDue) * 100);
    const automatic = renewal.renewalMethod === "AUTOMATIC";
    const token = subscription.recurringTokens[0] ?? null;
    const expiresAt = new Date(renewal.graceEndsAt.getTime());

    const attempt = await this.app.prisma.$transaction(async (tx) => {
      const created = await tx.billingPaymentAttempt.create({
        data: {
          workspaceBillingSubscriptionId: subscription.id,
          provider: "CHIP",
          idempotencyKey: `chip:renewal:${renewal.id}`,
          reference,
          attemptType: "RENEWAL",
          status: "CREATED",
          plan: renewal.plan,
          billingInterval: renewal.billingInterval,
          renewalMethod: renewal.renewalMethod,
          currency: renewal.currency,
          baseAmount: renewal.amountDue,
          discountAmount: 0,
          amountDue: renewal.amountDue,
          coverageStart: renewal.periodStart,
          coverageEnd: renewal.periodEnd,
          expiresAt,
        },
      });
      await tx.billingRenewal.update({
        where: { id: renewal.id },
        data: { paymentAttemptId: created.id, status: "INVOICED" },
      });
      return created;
    }, { isolationLevel: "Serializable" });

    let purchase: ChipPurchase;
    try {
      const returnUrl = this.requiredEnvironment("CHIP_RETURN_URL", env.CHIP_RETURN_URL);
      const webhookUrl = this.requiredEnvironment("CHIP_WEBHOOK_URL", env.CHIP_WEBHOOK_URL);
      const returnBase = returnUrl.includes("?") ? `${returnUrl}&` : `${returnUrl}?`;
      purchase = await this.client().createPurchase({
        client: {
          email: subscription.ownerUser.email,
          full_name: subscription.ownerUser.name ?? undefined,
        },
        purchase: {
          currency: "MYR",
          products: [{
            name: `MyPocket ${this.displayPlan(renewal.plan as BillingPlan)} ${this.displayInterval(renewal.billingInterval)}`,
            price: amountDueSen,
            quantity: 1,
          }],
          metadata: {
            workspaceId: subscription.workspaceId,
            paymentAttemptId: attempt.id,
            renewalId: renewal.id,
            plan: renewal.plan,
            interval: renewal.billingInterval,
            renewalMethod: renewal.renewalMethod,
          },
        },
        brand_id: this.requiredEnvironment("CHIP_BRAND_ID", env.CHIP_BRAND_ID),
        reference,
        send_receipt: true,
        force_recurring: automatic && !token,
        success_redirect: `${returnBase}billing=success&provider=chip`,
        failure_redirect: `${returnBase}billing=failure&provider=chip`,
        cancel_redirect: `${returnBase}billing=cancel&provider=chip`,
        success_callback: webhookUrl,
        creator_agent: "mypocket-ai",
        platform: "api",
      });
      this.assertPurchaseEnvironment(purchase);
      if (!purchase.id) {
        throw new AppError(
          "CHIP_RENEWAL_RESPONSE_INCOMPLETE",
          "CHIP returned an incomplete renewal response.",
          502,
        );
      }

      await this.app.prisma.billingPaymentAttempt.update({
        where: { id: attempt.id },
        data: {
          providerCheckoutId: purchase.id,
          status: "PENDING",
          checkoutUrl: purchase.checkout_url,
        },
      });

      if (automatic && token) {
        await this.client().chargePurchase(purchase.id, token.providerTokenId);
      }
    } catch (error) {
      await this.app.prisma.billingPaymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          failureCode: error instanceof AppError ? error.code : "CHIP_RENEWAL_FAILED",
          failureMessage: "CHIP renewal could not be started.",
        },
      });
      await this.app.prisma.billingRenewal.update({
        where: { id: renewal.id },
        data: { status: "FAILED", failedAt: new Date() },
      });
      throw error;
    }

    const updated = await this.app.prisma.billingPaymentAttempt.findUnique({
      where: { id: attempt.id },
    });
    if (!updated) {
      throw new AppError(
        "BILLING_PAYMENT_ATTEMPT_MISSING",
        "Billing payment attempt is unavailable.",
        500,
      );
    }
    return this.checkoutResponse(updated, false);
  }

  async reconcilePendingPayment(attemptId: string) {
    assertBillingProviderCallAllowed(env.BILLING_CHECKOUT_PROVIDER, "chip");
    const attempt = await this.app.prisma.billingPaymentAttempt.findUnique({
      where: { id: attemptId },
    });
    if (
      !attempt ||
      attempt.provider !== "CHIP" ||
      !attempt.providerCheckoutId ||
      !["CREATED", "PENDING"].includes(attempt.status)
    ) {
      return { reconciled: false, reason: "NOT_PENDING" as const };
    }

    const purchase = await this.client().retrievePurchase(attempt.providerCheckoutId);
    this.assertPurchaseEnvironment(purchase);
    if (purchase.status === "paid" || purchase.status === "preauthorized") {
      return {
        reconciled: false,
        reason: "SIGNED_WEBHOOK_REQUIRED" as const,
      };
    }
    if (["error", "blocked", "expired", "cancelled"].includes(purchase.status)) {
      const status = purchase.status === "expired" ? "EXPIRED" : "FAILED";
      await this.app.prisma.$transaction(async (tx) => {
        await tx.billingPaymentAttempt.update({
          where: { id: attempt.id },
          data: {
            status,
            failedAt: new Date(),
            failureCode: `RECONCILED_${purchase.status.toUpperCase()}`,
            failureMessage: "CHIP checkout ended without a successful payment.",
          },
        });
        await new PromotionService(this.app).cancelPromotionReservation(
          tx,
          attempt.id,
          `RECONCILED_${purchase.status.toUpperCase()}`,
        );
      });
      return { reconciled: true, status };
    }
    return { reconciled: false, reason: "STILL_PENDING" as const };
  }

  async receiveWebhook(input: { rawBody: Buffer; signature: string }) {
    const publicKey = this.requiredEnvironment(
      "CHIP_WEBHOOK_PUBLIC_KEY",
      env.CHIP_WEBHOOK_PUBLIC_KEY,
    );
    if (!verifyChipWebhookSignature({
      rawBody: input.rawBody,
      signature: input.signature,
      publicKeyPem: publicKey,
    })) {
      throw new AppError(
        "CHIP_WEBHOOK_SIGNATURE_INVALID",
        "CHIP webhook signature is invalid.",
        401,
      );
    }

    const payload = parseChipWebhookPayload(input.rawBody);
    this.assertPurchaseEnvironment(payload);
    const eventKey = chipWebhookEventKey(payload, input.rawBody);
    const purchaseId = chipWebhookPurchaseId(payload);

    try {
      return await this.app.prisma.$transaction(async (tx) => {
        const attempt = await tx.billingPaymentAttempt.findUnique({
          where: {
            provider_providerCheckoutId: {
              provider: "CHIP",
              providerCheckoutId: purchaseId,
            },
          },
          include: { workspaceBillingSubscription: true },
        });
        const event = await tx.billingWebhookEvent.create({
          data: {
            workspaceBillingSubscriptionId:
              attempt?.workspaceBillingSubscriptionId ?? null,
            provider: "CHIP",
            eventKey,
            signature: input.signature,
            eventObject: chipWebhookObjectType(payload),
            eventType: payload.event_type,
            externalId: payload.id,
            status: "RECEIVED",
            payload: payload as unknown as Prisma.InputJsonValue,
          },
        });

        if (!attempt) {
          await tx.billingWebhookEvent.update({
            where: { id: event.id },
            data: { status: "IGNORED", processedAt: new Date() },
          });
          return { received: true, duplicate: false, mapped: false };
        }

        const processedAt = new Date();
        const preauthorized =
          payload.event_type === "purchase.preauthorized"
          && payload.status === "preauthorized"
          && Number(attempt.amountDue) === 0;
        const successful =
          (payload.event_type === "purchase.paid" && payload.status === "paid")
          || preauthorized;
        const failed =
          payload.event_type === "purchase.payment_failure" ||
          payload.event_type === "purchase.subscription_charge_failure" ||
          ["error", "blocked", "expired", "cancelled"].includes(payload.status);
        const refunded =
          payload.event_type === "payment.refunded" ||
          payload.event_type === "payment.charged_back" ||
          payload.event_type === "purchase.refunded" ||
          ["refunded", "chargeback"].includes(payload.status);

        if (successful) {
          if(Number(attempt.amountDue) > 0){
            this.assertPaidAmount(payload, Number(attempt.amountDue));
          }
          const subscription = attempt.workspaceBillingSubscription;
          const coverageStart = attempt.coverageStart ?? processedAt;
          const coverageEnd = attempt.coverageEnd;
          if (!coverageEnd) {
            throw new AppError(
              "CHIP_COVERAGE_MISSING",
              "Billing coverage dates are unavailable.",
              500,
            );
          }
          const dueAt = new Date(coverageEnd.getTime());
          const graceEndsAt = new Date(
            dueAt.getTime() + getGraceDays(attempt.plan as BillingPlan) * 86_400_000,
          );

          await tx.billingPaymentAttempt.update({
            where: { id: attempt.id },
            data: {
              status: preauthorized ? "PENDING" : "PAID",
              providerPaymentId: payload.id,
              paidAt: preauthorized
                ? null
                : this.unixDate(payload.payment?.paid_on) ?? processedAt,
              failedAt: null,
              failureCode: null,
              failureMessage: null,
            },
          });
          const activatedPromotion = await new PromotionService(this.app).activatePromotionAfterConfirmation(
            tx,
            attempt.id,
            processedAt,
          );
          await new PromotionService(this.app).convertPromotionAfterPaidRenewal(
            tx,
            attempt.id,
            processedAt,
          );
          await tx.workspaceBillingSubscription.update({
            where: { id: subscription.id },
            data: {
              plan: attempt.plan,
              status: "ACTIVE",
              provider: "CHIP",
              providerPlanId: this.providerPlanId(
                attempt.plan as BillingPlan,
                attempt.billingInterval,
              ),
              pendingPlan: null,
              pendingProviderPlanId: null,
              planChangeRequestedAt: null,
              billingInterval: attempt.billingInterval,
              renewalMethod: attempt.renewalMethod,
              accessState: "ACTIVE",
              autoRenewEnabled: attempt.renewalMethod === "AUTOMATIC",
              checkoutReference: attempt.reference,
              checkoutUrl: null,
              currentPeriodStart: coverageStart,
              currentPeriodEnd: coverageEnd,
              paidThroughAt:
                attempt.attemptType === "UPGRADE"
                  ? subscription.paidThroughAt ?? coverageEnd
                  : coverageEnd,
              nextRenewalAt: coverageEnd,
              paymentDueAt: dueAt,
              graceEndsAt,
              lastPaymentAt: Number(attempt.amountDue) > 0 ? processedAt : null,
              lastPaymentStatus: Number(attempt.amountDue) > 0 ? "SUCCEEDED" : "PREAUTHORIZED",
              suspendedAt: null,
              reactivatedAt:
                subscription.accessState === "SUSPENDED" ? processedAt : null,
              canceledAt: null,
              lastWebhookAt: processedAt,
              cancelAtPeriodEnd: false,
            },
          });
          await tx.subscription.upsert({
            where: { userId: subscription.ownerUserId },
            create: {
              userId: subscription.ownerUserId,
              plan: attempt.plan,
              status: "ACTIVE",
              expiresAt: coverageEnd,
            },
            update: {
              plan: attempt.plan,
              status: "ACTIVE",
              expiresAt: coverageEnd,
            },
          });
          await tx.workspace.update({
            where: { id: subscription.workspaceId },
            data: { type: this.workspaceType(attempt.plan as BillingPlan) },
          });
          if(!preauthorized){
            await tx.billingRenewal.upsert({
              where: { paymentAttemptId: attempt.id },
              create: {
                workspaceBillingSubscriptionId: subscription.id,
                paymentAttemptId: attempt.id,
                invoiceReference: attempt.reference,
                status: "PAID",
                plan: attempt.plan,
                billingInterval: attempt.billingInterval,
                renewalMethod: attempt.renewalMethod,
                currency: "MYR",
                amountDue: attempt.amountDue,
                periodStart: coverageStart,
                periodEnd: coverageEnd,
                dueAt,
                graceEndsAt,
                paidAt: processedAt,
              },
              update: { status: "PAID", paidAt: processedAt },
            });
          }
          if(activatedPromotion?.trialEndsAt && activatedPromotion.autoConvert !== false){
            const trialCharge = Number(
              activatedPromotion.nextChargeAmount
              ?? activatedPromotion.originalAmount,
            );
            const trialDueAt =
              activatedPromotion.nextChargeAt
              ?? activatedPromotion.trialEndsAt;
            const conversionRenewal = await tx.billingRenewal.upsert({
              where:{ invoiceReference:`promo:${activatedPromotion.id}:conversion` },
              create:{
                workspaceBillingSubscriptionId:subscription.id,
                invoiceReference:`promo:${activatedPromotion.id}:conversion`,
                status:"SCHEDULED",
                plan:attempt.plan,
                billingInterval:attempt.billingInterval,
                renewalMethod:attempt.renewalMethod,
                currency:"MYR",
                amountDue:trialCharge,
                periodStart:trialDueAt,
                periodEnd:buildRenewalSchedule({
                  paidAt:trialDueAt,
                  paidThroughAt:trialDueAt,
                  interval:attempt.billingInterval,
                  plan:attempt.plan as BillingPlan,
                }).coverageEnd,
                dueAt:trialDueAt,
                graceEndsAt:new Date(
                  trialDueAt.getTime()
                  + getGraceDays(attempt.plan as BillingPlan) * 86_400_000,
                ),
              },
              update:{},
            });
            await tx.promoRedemption.update({
              where:{ id:activatedPromotion.id },
              data:{ conversionBillingRenewalId:conversionRenewal.id },
            });
          }
          const recurringToken =
            payload.recurring_token ??
            (payload.is_recurring_token ? purchaseId : null);
          if (
            attempt.renewalMethod === "AUTOMATIC" &&
            recurringToken
          ) {
            await tx.billingRecurringToken.upsert({
              where: {
                provider_providerTokenId: {
                  provider: "CHIP",
                  providerTokenId: recurringToken,
                },
              },
              create: {
                workspaceBillingSubscriptionId: subscription.id,
                provider: "CHIP",
                providerTokenId: recurringToken,
                status: "ACTIVE",
                paymentMethodType: payload.transaction_data?.payment_method,
              },
              update: {
                workspaceBillingSubscriptionId: subscription.id,
                status: "ACTIVE",
                paymentMethodType: payload.transaction_data?.payment_method,
                revokedAt: null,
              },
            });
          }
          if (subscription.accessState === "SUSPENDED") {
            await tx.billingReminderDelivery.upsert({
              where: { dedupeKey: `${subscription.id}:ACCESS_REACTIVATED:${attempt.id}` },
              create: {
                workspaceBillingSubscriptionId: subscription.id,
                dedupeKey: `${subscription.id}:ACCESS_REACTIVATED:${attempt.id}`,
                reminderType: "ACCESS_REACTIVATED",
                scheduledFor: processedAt,
              },
              update: {},
            });
          }
        } else if (failed) {
          await tx.billingPaymentAttempt.update({
            where: { id: attempt.id },
            data: {
              status: payload.status === "expired" ? "EXPIRED" : "FAILED",
              failedAt: processedAt,
              failureCode: payload.status,
              failureMessage: "CHIP reported an unsuccessful payment.",
            },
          });
          await new PromotionService(this.app).cancelPromotionReservation(
            tx,
            attempt.id,
            `CHIP_${payload.status.toUpperCase()}`,
          );
          await tx.workspaceBillingSubscription.update({
            where: { id: attempt.workspaceBillingSubscriptionId },
            data: {
              lastPaymentAt: processedAt,
              lastPaymentStatus: "FAILED",
              lastWebhookAt: processedAt,
            },
          });
        } else if (refunded) {
          await tx.billingPaymentAttempt.update({
            where: { id: attempt.id },
            data: {
              status: "REFUNDED",
              failureCode: payload.status,
              failureMessage: "CHIP reported a refunded or reversed payment.",
            },
          });
          await tx.workspaceBillingSubscription.update({
            where: { id: attempt.workspaceBillingSubscriptionId },
            data: {
              status: "SUSPENDED",
              accessState: "SUSPENDED",
              autoRenewEnabled: false,
              suspendedAt: processedAt,
              lastPaymentAt: processedAt,
              lastPaymentStatus: "REFUNDED",
              lastWebhookAt: processedAt,
            },
          });
          await tx.subscription.updateMany({
            where: { userId: attempt.workspaceBillingSubscription.ownerUserId },
            data: { status: "INACTIVE" },
          });
          await tx.billingReminderDelivery.upsert({
            where: { dedupeKey: `${attempt.workspaceBillingSubscriptionId}:ACCESS_SUSPENDED_REFUND:${attempt.id}` },
            create: {
              workspaceBillingSubscriptionId: attempt.workspaceBillingSubscriptionId,
              dedupeKey: `${attempt.workspaceBillingSubscriptionId}:ACCESS_SUSPENDED_REFUND:${attempt.id}`,
              reminderType: "ACCESS_SUSPENDED",
              scheduledFor: processedAt,
            },
            update: {},
          });
        }

        await tx.billingWebhookEvent.update({
          where: { id: event.id },
          data: {
            status: successful ? "PROCESSED_ACTIVATED" : failed || refunded ? "PROCESSED" : "IGNORED",
            processedAt,
          },
        });
        return {
          received: true,
          duplicate: false,
          mapped: true,
          activated: successful,
          refunded,
        };
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
      ) {
        return { received: true, duplicate: true, mapped: true };
      }
      throw error;
    }
  }

  private async assertOwner(actor: SessionActor) {
    const membership = await this.app.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: actor.userId,
          workspaceId: actor.workspaceId,
        },
      },
      include: {
        user: { include: { subscription: true } },
        workspace: { include: { billingSubscription: true } },
      },
    });
    if (
      !membership ||
      membership.role !== "OWNER" ||
      membership.workspace.ownerId !== actor.userId ||
      membership.user.status !== "ACTIVE" ||
      membership.user.email.trim().toLowerCase() !== actor.email.trim().toLowerCase()
    ) {
      throw new AppError(
        "BILLING_OWNER_REQUIRED",
        "Only the active workspace owner can manage subscriptions.",
        403,
      );
    }
    return membership;
  }

  private async assertPlanAllowed(userId: string, plan: BillingPlan) {
    if (plan !== "PERSONAL_PRO") return;
    const familyMembership = await this.app.prisma.workspaceMember.findFirst({
      where: { userId, workspace: { type: "FAMILY" } },
    });
    if (familyMembership) {
      throw new AppError(
        "FAMILY_MEMBER_CANNOT_BUY_PERSONAL_PRO",
        "Please leave the Family workspace before purchasing Personal Pro.",
        403,
      );
    }
  }

  private async settings() {
    const settings = await this.app.prisma.billingSettings.findUnique({
      where: { id: "global" },
    });
    if (!settings) {
      throw new AppError(
        "BILLING_SETTINGS_MISSING",
        "Global billing settings are unavailable.",
        503,
      );
    }
    return settings;
  }

  private async quote(plan: BillingPlan, interval: ChipCheckoutInput["interval"]) {
    const settings = await this.settings();
    return computePlanQuote({
      plan,
      interval,
      annualDiscountPercent: String(settings.annualDiscountPercent),
    });
  }

  private client() {
    return this.dependencies.client ?? new ChipClient({
      apiBaseUrl: env.CHIP_API_BASE_URL,
      apiKey: this.requiredEnvironment("CHIP_API_KEY", env.CHIP_API_KEY),
    });
  }

  private requiredEnvironment(name: string, value: string | undefined) {
    if (!value) {
      throw new AppError(
        "CHIP_CONFIGURATION_INCOMPLETE",
        `${name} is not configured.`,
        503,
      );
    }
    return value;
  }

  private providerPlanId(plan: BillingPlan, interval: ChipCheckoutInput["interval"]) {
    return `CHIP:${plan}:${interval}`;
  }

  private paidPlan(value: string | null | undefined): BillingPlan | null {
    return value === "PERSONAL_PRO" || value === "FAMILY" || value === "BUSINESS"
      ? value
      : null;
  }

  private displayPlan(plan: BillingPlan) {
    return ({
      PERSONAL_PRO: "Personal Pro",
      FAMILY: "Family",
      BUSINESS: "Business / Company",
    } as const)[plan];
  }

  private displayInterval(interval: ChipCheckoutInput["interval"]) {
    return ({
      MONTHLY: "1 month",
      SIX_MONTHS: "6 months",
      YEARLY: "1 year",
    } as const)[interval];
  }

  private workspaceType(plan: BillingPlan) {
    return ({
      PERSONAL_PRO: "PERSONAL",
      FAMILY: "FAMILY",
      BUSINESS: "BUSINESS",
    } as const)[plan];
  }

  private checkoutResponse(
    attempt: {
      checkoutUrl: string | null;
      reference: string;
      plan: string;
      billingInterval: ChipCheckoutInput["interval"];
      renewalMethod: ChipCheckoutInput["renewalMethod"];
      amountDue: unknown;
      expiresAt: Date | null;
    },
    reused: boolean,
  ) {
    return {
      provider: "CHIP" as const,
      checkoutUrl: attempt.checkoutUrl,
      reference: attempt.reference,
      plan: attempt.plan,
      interval: attempt.billingInterval,
      renewalMethod: attempt.renewalMethod,
      amount: Number(attempt.amountDue),
      currency: "MYR" as const,
      expiresAt: attempt.expiresAt,
      reused,
      scheduled: false,
    };
  }

  private assertPurchaseEnvironment(purchase: { is_test: boolean }) {
    const expectedTest = env.CHIP_ENVIRONMENT === "test";
    if (purchase.is_test !== expectedTest) {
      throw new AppError(
        "CHIP_ENVIRONMENT_MISMATCH",
        "CHIP test/live environment does not match this server.",
        400,
      );
    }
  }

  private assertPaidAmount(
    payload: {
      payment?: { amount?: number; currency?: string } | null;
      purchase?: { total?: number; currency?: string };
    },
    expectedRinggit: number,
  ) {
    const amountSen = payload.payment?.amount ?? payload.purchase?.total;
    const currency = payload.payment?.currency ?? payload.purchase?.currency;
    if (
      !Number.isSafeInteger(amountSen) ||
      amountSen !== Math.round(expectedRinggit * 100) ||
      currency !== "MYR"
    ) {
      throw new AppError(
        "CHIP_PAYMENT_MISMATCH",
        "CHIP payment amount or currency does not match the billing attempt.",
        400,
      );
    }
  }

  private unixDate(value: number | undefined) {
    return Number.isFinite(value) ? new Date((value as number) * 1_000) : null;
  }
}
