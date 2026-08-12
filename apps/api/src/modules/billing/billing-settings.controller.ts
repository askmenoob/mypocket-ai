import type { FastifyRequest } from "fastify";
import { UpdateBillingAnnualDiscountSchema } from "./billing-settings.schemas.js";
import { BillingSettingsService } from "./billing-settings.service.js";

export class BillingSettingsController {
  private readonly service: BillingSettingsService;

  constructor(requestServer: FastifyRequest["server"]) {
    this.service = new BillingSettingsService(requestServer);
  }

  private actor(request: FastifyRequest) {
    return {
      userId: request.user.userId,
      email: request.user.email,
      workspaceId: request.user.workspaceId,
    };
  }

  getSettings = async (request: FastifyRequest) =>
    this.service.getSettings(this.actor(request));

  updateAnnualDiscount = async (request: FastifyRequest) =>
    this.service.updateAnnualDiscount(
      this.actor(request),
      UpdateBillingAnnualDiscountSchema.parse(request.body),
    );
}
