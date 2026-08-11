import type { FastifyRequest } from "fastify";

import {
  CreatePromotionCampaignSchema,
  PromotionAdminQuerySchema,
  PromotionQuoteSchema,
  PromotionRedeemSchema,
  PromotionTransitionSchema,
  UpdatePromotionCampaignSchema,
} from "./promotion.schemas.js";
import { PromotionService } from "./promotion.service.js";

type IdParams = { campaignId:string };
type RedemptionParams = { redemptionId:string };

export class PromotionController {
  private readonly service:PromotionService;

  constructor(requestServer:FastifyRequest["server"]){
    this.service = new PromotionService(requestServer);
  }

  private actor(request:FastifyRequest){
    return {
      userId:request.user.userId,
      email:request.user.email,
      workspaceId:request.user.workspaceId,
    };
  }

  listCampaigns = async (request:FastifyRequest) =>
    this.service.listCampaigns(this.actor(request));

  createCampaign = async (request:FastifyRequest) =>
    this.service.createCampaign(
      this.actor(request),
      CreatePromotionCampaignSchema.parse(request.body),
    );

  updateCampaign = async (
    request:FastifyRequest<{ Params:IdParams }>,
  ) => this.service.updateCampaign(
    this.actor(request),
    request.params.campaignId,
    UpdatePromotionCampaignSchema.parse(request.body),
  );

  transitionCampaign = async (
    request:FastifyRequest<{ Params:IdParams }>,
  ) => {
    const body = PromotionTransitionSchema.parse(request.body);
    return this.service.transitionCampaign(
      this.actor(request),
      request.params.campaignId,
      body.status,
    );
  };

  quote = async (request:FastifyRequest) =>
    this.service.quote(
      this.actor(request),
      PromotionQuoteSchema.parse(request.body),
    );

  redeem = async (request:FastifyRequest) =>
    this.service.redeem(
      this.actor(request),
      PromotionRedeemSchema.parse(request.body),
    );

  cancelRedemption = async (
    request:FastifyRequest<{ Params:RedemptionParams }>,
  ) => this.service.cancelRedemption(
    this.actor(request),
    request.params.redemptionId,
  );

  listUsage = async (request:FastifyRequest) => {
    const query = PromotionAdminQuerySchema.parse(request.query);
    return this.service.listUsage(
      this.actor(request),
      query.campaignId,
      query.limit,
    );
  };

  listAudit = async (request:FastifyRequest) => {
    const query = PromotionAdminQuerySchema.parse(request.query);
    return this.service.listAudit(
      this.actor(request),
      query.campaignId,
      query.limit,
    );
  };
}
