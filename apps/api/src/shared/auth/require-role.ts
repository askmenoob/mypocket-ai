import type {
  FastifyRequest,
  FastifyReply,
} from "fastify";

import type {
  Role,
} from "./roles.js";



export function requireRole(
  ...allowedRoles: Role[]
) {


  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {


    await request.jwtVerify();



    const membership =
      await request.server.prisma.workspaceMember.findFirst({

        where: {

          userId:
            request.user.userId,

          workspaceId:
            request.user.workspaceId,

        },

      });



    if (!membership) {

      return reply
        .code(403)
        .send({

          error:
            "WORKSPACE_ACCESS_DENIED",

        });

    }



    if (
      !allowedRoles.includes(
        membership.role as Role,
      )
    ) {

      return reply
        .code(403)
        .send({

          error:
            "INSUFFICIENT_ROLE",

        });

    }


  };

}
