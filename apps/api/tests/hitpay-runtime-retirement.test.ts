import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const apiRoot = process.cwd();
const read = (path:string) => readFileSync(resolve(apiRoot, path), "utf8");

test("runtime exposes CHIP billing without HitPay routes or configuration", () => {
  const env = read("src/config/env.ts");
  const routes = read("src/modules/billing/index.ts");
  const policy = read("src/modules/billing/billing-provider.policy.ts");

  assert.doesNotMatch(env, /HITPAY_|"hitpay"/u);
  assert.doesNotMatch(routes, /hitpay|HitPay/u);
  assert.doesNotMatch(policy, /hitpay|HitPay/u);
  assert.match(routes, /activeChipWebhookPath/u);

  for (const retiredPath of [
    "src/config/hitpay-environment.ts",
    "src/modules/billing/hitpay.client.ts",
    "src/modules/billing/billing.controller.ts",
    "src/modules/billing/billing.service.ts",
  ]) {
    assert.equal(existsSync(resolve(apiRoot, retiredPath)), false, retiredPath);
  }
});

test("new billing rows default to CHIP without rewriting historical rows", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read(
    "prisma/migrations/20260812230000_retire_hitpay_runtime/migration.sql",
  );

  assert.equal(
    schema
      .split("\n")
      .filter((line) => line.includes('provider') && line.includes('@default("CHIP")'))
      .length,
    2,
  );
  assert.ok(migration.includes('ALTER COLUMN "provider" SET DEFAULT \'CHIP\''));
  assert.doesNotMatch(migration, /DELETE|TRUNCATE|DROP|UPDATE/iu);
});
