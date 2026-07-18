import type {
  FastifyInstance,
} from "fastify";

import {
  MemberRepository,
} from "./member.repository.js";


export class MemberService {


  private readonly repository:
    MemberRepository;



  constructor(
    app: FastifyInstance,
  ) {

    this.repository =
      new MemberRepository(
        app.prisma,
      );

  }



  async getMembers(
    workspaceId: string,
  ) {

    return this.repository
      .findMembers(
        workspaceId,
      );

  }



  async updateRole(
    memberId: string,
    role:
      "OWNER"
      | "ADMIN"
      | "MEMBER"
      | "VIEWER",
  ) {

    const member =
      await this.repository.findMember(
        memberId,
      );


    if (!member) {

      throw new Error(
        "MEMBER_NOT_FOUND",
      );

    }


    if (
      member.role === "OWNER"
      &&
      role !== "OWNER"
    ) {

      throw new Error(
        "OWNER_ROLE_CANNOT_BE_CHANGED",
      );

    }


    return this.repository.updateRole(
      memberId,
      role,
    );

  }



  async removeMember(
    memberId: string,
  ) {

    const member =
      await this.repository.findMember(
        memberId,
      );


    if (!member) {

      throw new Error(
        "MEMBER_NOT_FOUND",
      );

    }


    if (
      member.role === "OWNER"
    ) {

      throw new Error(
        "OWNER_CANNOT_BE_REMOVED",
      );

    }


    return this.repository.removeMember(
      memberId,
    );

  }


}
