import type { FastifyReply, FastifyRequest } from "fastify";

import { AppError } from "../errors/app-error.js";
import { isSuperAdminEmail } from "./super-admin.js";

export async function requireSuperAdmin(
  request:FastifyRequest,
  _reply:FastifyReply,
):Promise<void>{
  if(!isSuperAdminEmail(request.user?.email)){
    throw new AppError(
      "SUPER_ADMIN_REQUIRED",
      "Only Super Admin can manage promotion settings",
      403,
    );
  }
}
