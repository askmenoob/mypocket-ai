import type {
  FastifyInstance,
  FastifyRequest,
} from "fastify";

import {
  WorkspaceService,
} from "./workspace.service.js";


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
      );

  };

}
