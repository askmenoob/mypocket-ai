import type {
  FastifyInstance,
  FastifyRequest,
} from "fastify";

import {
  MemberService,
} from "./member.service.js";


export class MemberController {


  private readonly service:
    MemberService;



  constructor(
    app: FastifyInstance,
  ) {

    this.service =
      new MemberService(
        app,
      );

  }



  list = async (
    request: FastifyRequest,
  ) => {


    await request.jwtVerify();



    return this.service
      .getMembers(
        request.user.workspaceId,
      );

  };


}
