import type {
  FastifyInstance,
} from "fastify";

import {
  MemberRepository,
} from "./member.repository.js";

import type {
  MemberRole,
} from "./member.types.js";

import {
  AppError,
} from "../../shared/errors/index.js";


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



  async addMember(
    workspaceId: string,
    email: string,
    role: MemberRole,
  ) {


    const user =
      await this.repository.findUserByEmail(
        email,
      );


    if (!user) {

      throw new AppError(
        "USER_NOT_FOUND",
        "User not found",
        404,
      );

    }



    const members =
      await this.repository.findMembers(
        workspaceId,
      );


    const exists =
      members.some(
        (member) =>
          member.userId === user.id,
      );


    if (exists) {

      throw new AppError(
        "MEMBER_ALREADY_EXISTS",
        "Member already exists in workspace",
        409,
      );

    }



    return this.repository.createMember(
      workspaceId,
      user.id,
      role,
    );

  }



  async updateRole(
    memberId: string,
    role: MemberRole,
  ) {

    const member =
      await this.repository.findMember(
        memberId,
      );


    if (!member) {

      throw new AppError(
        "MEMBER_NOT_FOUND",
        "Member not found",
        404,
      );

    }


    if (
      member.role === "OWNER"
      &&
      role !== "OWNER"
    ) {

      throw new AppError(
        "OWNER_ROLE_CANNOT_BE_CHANGED",
        "Owner role cannot be changed",
        400,
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

      throw new AppError(
        "MEMBER_NOT_FOUND",
        "Member not found",
        404,
      );

    }


    if (
      member.role === "OWNER"
    ) {

      throw new AppError(
        "OWNER_CANNOT_BE_REMOVED",
        "Owner cannot be removed",
        400,
      );

    }


    return this.repository.removeMember(
      memberId,
    );

  }


}
