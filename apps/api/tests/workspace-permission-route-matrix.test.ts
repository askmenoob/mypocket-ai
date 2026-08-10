import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path:string){
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function routeBlock(
  text:string,
  route:string,
){
  const start = text.indexOf(`"${route}"`);
  assert.notEqual(start, -1, `route ${route} is missing`);
  return text.slice(start, start + 260);
}

test("workspace route matrix requires membership or explicit role", () => {
  const routes = source("src/modules/workspace/workspace.routes.ts");

  for (const route of ["/me", "/all", "/invites/accept", "/"]){
    assert.match(routeBlock(routes, route), /preHandler:\[app\.authenticate\]/);
  }

  assert.match(
    routeBlock(routes, "/name"),
    /requireRole\(Roles\.OWNER, Roles\.ADMIN\)/,
  );
  assert.match(
    routeBlock(routes, "/invites"),
    /requireRole\(Roles\.OWNER, Roles\.ADMIN\)/,
  );

  for (const route of [
    "/admin/users",
    "/admin/users/:userId/package",
    "/admin/users/:userId/google-sheet/upgrade",
    "/admin/users/:userId/whatsapp/disconnect",
    "/admin/users/:userId/ban",
    "/admin/users/:userId/unban",
    "/admin/users/:userId/deactivate",
    "/admin/users/:userId/reactivate",
    "/admin/users/:userId/delete",
    "/:id/switch",
  ]){
    assert.match(routeBlock(routes, route), /preHandler:\[app\.authenticate\]/);
  }
});

test("Apps Script test endpoint is workspace-authenticated", () => {
  const routes = source("src/modules/google/apps-script/apps-script.routes.ts");
  assert.match(
    routeBlock(routes, "/test"),
    /requireRole\(\s*Roles\.OWNER,\s*Roles\.ADMIN,\s*Roles\.MEMBER,/s,
  );
});

test("direct member add cannot escalate or bypass actor checks", () => {
  const service = source("src/modules/member/member.service.ts");
  assert.match(service, /INVITE_REQUIRED/);
  assert.match(service, /Members must be added through the workspace invite flow/);
});
