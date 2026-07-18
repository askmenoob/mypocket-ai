import type { FastifyInstance } from "fastify";
import {
  WorkspaceRepository,
} from "./workspace.repository.js";

import type {
  WorkspaceContext,
} from "./workspace.types.js";


export class WorkspaceService {

  private readonly repository:
    WorkspaceRepository;


  constructor(
    app: FastifyInstance,
  ) {

    this.repository =
      new WorkspaceRepository(
        app.prisma,
      );

  }



  async getCurrentWorkspace(
    userId: string,
  ): Promise<WorkspaceContext> {


    const membership =
      await this.repository
        .findWorkspaceForUser(
          userId,
        );


    if (!membership) {

      throw new Error(
        "WORKSPACE_NOT_FOUND",
      );

    }


    return {

      id:
        membership.workspace.id,

      name:
        membership.workspace.name,

      role:
        membership.role as WorkspaceContext["role"],

    };

  }

}
