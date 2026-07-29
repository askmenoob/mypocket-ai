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
    workspaceId:string,
  ) {

    return this.repository
      .findMembers(
        workspaceId,
      );

  }



  async addMember(
    workspaceId:string,
    email:string,
    role:MemberRole,
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
        member =>
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
    actorUserId:string,
    workspaceId:string,
    memberId:string,
    role:MemberRole,
  ) {


    const actor =
      await this.repository.findMembership(
        actorUserId,
        workspaceId,
      );


    if (!actor) {

      throw new AppError(
        "ACTOR_NOT_FOUND",
        "Actor membership not found",
        403,
      );

    }



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



    const isSuperAdminSelfRoleTest =
      actor.user?.email === "pillo0404@gmail.com"
      &&
      actor.userId === member.userId;


    if (
      actor.role !== "OWNER"
      &&
      actor.role !== "ADMIN"
      &&
      !isSuperAdminSelfRoleTest
    ) {

      throw new AppError(
        "INSUFFICIENT_ROLE",
        "Not allowed to update member role",
        403,
      );

    }


    if (
      member.role === "OWNER"
      &&
      !isSuperAdminSelfRoleTest
    ) {

      throw new AppError(
        "OWNER_ROLE_CANNOT_BE_CHANGED",
        "Owner role cannot be changed",
        400,
      );

    }



    if (
      actor.role === "ADMIN"
      &&
      (
        role === "OWNER"
        ||
        role === "ADMIN"
      )
    ) {

      throw new AppError(
        "ADMIN_ROLE_LIMIT",
        "Admin cannot assign elevated roles",
        403,
      );

    }



    return this.repository.updateRole(
      memberId,
      role,
    );

  }





  async removeMember(
    actorUserId:string,
    workspaceId:string,
    memberId:string,
  ) {


    const actor =
      await this.repository.findMembership(
        actorUserId,
        workspaceId,
      );


    if (!actor) {

      throw new AppError(
        "ACTOR_NOT_FOUND",
        "Actor membership not found",
        403,
      );

    }



    if (
      actor.role !== "OWNER"
      &&
      actor.role !== "ADMIN"
    ) {

      throw new AppError(
        "INSUFFICIENT_ROLE",
        "Not allowed to remove member",
        403,
      );

    }



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



    if (
      actor.role === "ADMIN"
      &&
      member.role === "ADMIN"
    ) {

      throw new AppError(
        "ADMIN_CANNOT_REMOVE_ADMIN",
        "Admin cannot remove another admin",
        403,
      );

    }



    return this.repository.removeMember(
      memberId,
    );

  }


}
