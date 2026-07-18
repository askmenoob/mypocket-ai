import type {
  FastifyInstance,
  FastifyRequest,
} from "fastify";


import {
  MemberService,
} from "./member.service.js";


import {
  CreateMemberSchema,
} from "./member.schemas.js";



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




  add = async (
    request: FastifyRequest,
  ) => {


    await request.jwtVerify();



    const body =
      CreateMemberSchema.parse(
        request.body,
      );



    return this.service
      .addMember(
        request.user.workspaceId,
        body.email,
        body.role,
      );

  };


}
