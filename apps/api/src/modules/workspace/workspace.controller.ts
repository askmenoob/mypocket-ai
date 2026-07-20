import type {
  FastifyInstance,
  FastifyRequest,
} from "fastify";

import {
  WorkspaceService,
} from "./workspace.service.js";


import {
  CreateWorkspaceSchema,
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



}
