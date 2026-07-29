import type {
  FastifyInstance,
  FastifyRequest,
} from "fastify";

import {
  WorkspaceService,
} from "./workspace.service.js";


import {
  CreateWorkspaceSchema,
  UpdateUserPackageSchema,
} from "./workspace.schemas.js";


export class WorkspaceController {

  private readonly service:
    WorkspaceService;


  constructor(
    app: FastifyInstance,
  ) {

    this.service =
      new WorkspaceService(
        app,
      );

  }



  me = async (
    request:
      FastifyRequest,
  ) => {


    await request.jwtVerify();


    return this.service
      .getCurrentWorkspace(
        request.user.userId,
        request.user.workspaceId,
      );

  };



  list = async (
    request:
      FastifyRequest,
  ) => {


    await request.jwtVerify();


    return this.service
      .getUserWorkspaces(
        request.user.userId,
      );

  };



  adminListUsers = async (
    request:
      FastifyRequest,
  ) => {


    await request.jwtVerify();


    return this.service
      .listAdminUsers(
        request.user.email,
      );

  };



  adminUpdateUserPackage = async (
    request:
      FastifyRequest<{
        Params:{
          userId:string;
        };
      }>,
  ) => {


    await request.jwtVerify();


    const body =
      UpdateUserPackageSchema
        .parse(
          request.body,
        );


    return this.service
      .updateUserPackage(
        request.user.email,
        request.params.userId,
        body.package,
      );

  };



  adminUpgradeUserGoogleSheet = async (
    request:
      FastifyRequest<{
        Params:{
          userId:string;
        };
      }>,
  ) => {

    await request.jwtVerify();

    return this.service
      .adminUpgradeUserGoogleSheet(
        request.user.email,
        request.params.userId,
      );

  };



  adminDisconnectUserWhatsApp = async (
    request:
      FastifyRequest<{
        Params:{
          userId:string;
        };
      }>,
  ) => {

    await request.jwtVerify();

    return this.service
      .adminDisconnectUserWhatsApp(
        request.user.email,
        request.params.userId,
      );

  };



  adminBanUser = async (
    request:
      FastifyRequest<{
        Params:{
          userId:string;
        };
      }>,
  ) => {

    await request.jwtVerify();

    return this.service
      .adminSetUserAccessStatus(
        request.user.email,
        request.params.userId,
        "BANNED",
      );

  };



  adminUnbanUser = async (
    request:
      FastifyRequest<{
        Params:{
          userId:string;
        };
      }>,
  ) => {

    await request.jwtVerify();

    return this.service
      .adminSetUserAccessStatus(
        request.user.email,
        request.params.userId,
        "ACTIVE",
      );

  };



  adminDeactivateUser = async (
    request:
      FastifyRequest<{
        Params:{
          userId:string;
        };
      }>,
  ) => {

    await request.jwtVerify();

    return this.service
      .adminSetUserAccessStatus(
        request.user.email,
        request.params.userId,
        "DEACTIVATED",
      );

  };



  adminReactivateUser = async (
    request:
      FastifyRequest<{
        Params:{
          userId:string;
        };
      }>,
  ) => {

    await request.jwtVerify();

    return this.service
      .adminSetUserAccessStatus(
        request.user.email,
        request.params.userId,
        "ACTIVE",
      );

  };






  create = async (
    request:
      FastifyRequest,
  ) => {


    await request.jwtVerify();


    const body =
      CreateWorkspaceSchema.parse(
        request.body,
      );


    return this.service
      .createWorkspace(
        request.user.userId,
        body.name,
        body.type,
      );

  };





  switch = async (
    request:
      FastifyRequest<{
        Params:{
          id:string;
        };
      }>,
  ) => {


    await request.jwtVerify();


    return this.service
      .switchWorkspace(
        request.user.userId,
        request.user.email,
        request.params.id,
      );

  };


  createInvite =
    async (
      request:any,
      reply:any,
    ) => {

      await request.jwtVerify();

      const result =
        await this.service.createInvite({
          actorUserId:
            request.user.userId,

          workspaceId:
            request.user.workspaceId,

          email:
            request.body?.email,

          whatsappPhoneNumber:
            request.body?.whatsappPhoneNumber,

          role:
            request.body?.role,
        });

      return reply.send(result);

    };



  acceptInvite =
    async (
      request:any,
      reply:any,
    ) => {

      await request.jwtVerify();

      const result =
        await this.service.acceptInvite({
          userId:
            request.user.userId,

          email:
            request.user.email,

          token:
            request.body?.token,
        });

      return reply.send(result);

    };




}
