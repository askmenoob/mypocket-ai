import type {
  FastifyInstance,
} from "fastify";


export class TokenService {


  constructor(
    private readonly app: FastifyInstance,
  ) {}



  async generate(
    userId:string,
    email:string,
    workspaceId:string,
    role:string,
  ) {


    return this.app.jwt.sign({

      userId,

      email,

      workspaceId,

      role,

    });


  }


}
