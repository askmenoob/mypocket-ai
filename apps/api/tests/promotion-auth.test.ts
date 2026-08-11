import assert from "node:assert/strict";
import test from "node:test";

import { requireSuperAdmin } from "../src/shared/auth/require-super-admin.js";

const reply = {} as never;

test("Super Admin promotion guard accepts the configured identity", async () => {
  await assert.doesNotReject(() => requireSuperAdmin({
    user:{ email:"  PILLO0404@GMAIL.COM  " },
  } as never, reply));
});

test("Super Admin promotion guard rejects a normal authenticated user", async () => {
  await assert.rejects(
    () => requireSuperAdmin({ user:{ email:"member@example.com" } } as never, reply),
    (error:any) => error?.code === "SUPER_ADMIN_REQUIRED" && error?.statusCode === 403,
  );
});

test("Super Admin promotion guard fails closed for missing or malformed identity", async () => {
  await assert.rejects(
    () => requireSuperAdmin({} as never, reply),
    (error:any) => error?.code === "SUPER_ADMIN_REQUIRED",
  );
  await assert.rejects(
    () => requireSuperAdmin({ user:{ email:"" } } as never, reply),
    (error:any) => error?.code === "SUPER_ADMIN_REQUIRED",
  );
});
