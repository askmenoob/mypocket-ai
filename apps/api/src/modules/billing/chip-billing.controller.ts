import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../../shared/errors/app-error.js";
import {
  chipCheckoutSchema,
  chipPaymentMethodsQuerySchema,
} from "./chip-billing.schemas.js";
import type { ChipBillingService } from "./chip-billing.service.js";

type RawBodyRequest = FastifyRequest & { rawBody: Buffer | null };

export class ChipBillingController {
  constructor(private readonly service: ChipBillingService) {}

  getQuote = async (request: FastifyRequest) =>
    this.service.getQuote(
      this.actor(request),
      chipPaymentMethodsQuerySchema.parse(request.query),
    );

  getPaymentMethods = async (request: FastifyRequest) =>
    this.service.getPaymentMethods(
      this.actor(request),
      chipPaymentMethodsQuerySchema.parse(request.query),
    );

  createCheckout = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.createCheckout(
      this.actor(request),
      chipCheckoutSchema.parse(request.body),
    );
    const reused = "reused" in result && result.reused;
    return reply.code(reused || result.scheduled ? 200 : 201).send(result);
  };

  cancelAutomaticRenewal = async (request: FastifyRequest) =>
    this.service.cancelAutomaticRenewal(this.actor(request));

  receiveWebhook = async (request: FastifyRequest, reply: FastifyReply) => {
    const rawBody = (request as RawBodyRequest).rawBody;
    if (!rawBody) {
      throw new AppError(
        "CHIP_RAW_BODY_MISSING",
        "Raw webhook body is unavailable.",
        500,
      );
    }
    const signatureValue = request.headers["x-signature"];
    const signature = Array.isArray(signatureValue)
      ? signatureValue[0] ?? ""
      : signatureValue ?? "";
    if (!signature) {
      throw new AppError(
        "CHIP_WEBHOOK_SIGNATURE_MISSING",
        "CHIP webhook signature is missing.",
        401,
      );
    }
    const result = await this.service.receiveWebhook({ rawBody, signature });
    return reply.code(200).send(result);
  };

  private actor(request: FastifyRequest) {
    return {
      userId: request.user.userId,
      workspaceId: request.user.workspaceId,
      email: request.user.email,
    };
  }
}
