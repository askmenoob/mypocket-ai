import assert from "node:assert/strict";
import test from "node:test";

import Fastify from "fastify";

import promotionRoutes from "../src/modules/promotion/promotion.routes.js";

test("promotion management route enforces workspace auth, Super Admin and active DB actor", async () => {
  const app = Fastify({ logger:false });
  let dbActor = {
    id:"super-user",
    email:"pillo0404@gmail.com",
    status:"ACTIVE",
  };
  const prisma = {
    user:{ findUnique:async () => dbActor },
    promoCampaign:{ findMany:async () => [] },
  };

  app.decorate("prisma", prisma as never);
  app.decorate("authenticate", async (request:any) => {
    const identity = request.headers["x-test-identity"];
    if(identity === "normal"){
      request.user = { userId:"member", workspaceId:"workspace", email:"member@example.com" };
      return;
    }
    if(identity === "missing"){
      request.user = { userId:"", workspaceId:"", email:"" };
      return;
    }
    request.user = {
      userId:"super-user",
      workspaceId:"workspace",
      email:"pillo0404@gmail.com",
    };
  });
  await app.register(promotionRoutes, { prefix:"/promotion" });

  const allowed = await app.inject({
    method:"GET",
    url:"/promotion/admin/campaigns",
    headers:{ "x-test-identity":"super" },
  });
  assert.equal(allowed.statusCode, 200);
  assert.deepEqual(allowed.json(), []);

  for(const identity of ["normal", "missing"]){
    const denied = await app.inject({
      method:"GET",
      url:"/promotion/admin/campaigns",
      headers:{ "x-test-identity":identity },
    });
    assert.equal(denied.statusCode, 403);
    assert.match(denied.body, /SUPER_ADMIN_REQUIRED|Only Super Admin/u);
  }

  dbActor = { ...dbActor, status:"DISABLED" };
  const disabled = await app.inject({
    method:"GET",
    url:"/promotion/admin/campaigns",
    headers:{ "x-test-identity":"super" },
  });
  assert.equal(disabled.statusCode, 403);

  dbActor = { ...dbActor, status:"ACTIVE", email:"other@example.com" };
  const mismatched = await app.inject({
    method:"GET",
    url:"/promotion/admin/campaigns",
    headers:{ "x-test-identity":"super" },
  });
  assert.equal(mismatched.statusCode, 403);

  await app.close();
});
