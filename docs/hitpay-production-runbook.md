# HitPay Production Cutover Runbook

This runbook moves MyPocket from the HitPay sandbox account to the separate
HitPay production account. It does not authorize a real-money charge. The
production proof in the final phase requires explicit owner approval.

## Fixed environment contract

| Setting | Sandbox | Production |
| --- | --- | --- |
| API origin | `https://api.sandbox.hit-pay.com` | `https://api.hit-pay.com` |
| Webhook path | `/api/v1/billing/hitpay/webhook/sandbox` | `/api/v1/billing/hitpay/webhook/production` |
| API key and signing salt | Sandbox account only | Production account only |
| Recurring plan IDs | Sandbox plans only | Production plans only |

MyPocket validates this contract at startup. A mixed API origin, webhook route,
or duplicate plan ID must prevent the API from starting.

Webhook requests also fail closed unless `CF-Connecting-IP` matches the
environment-specific HitPay source list and the raw-body HMAC is valid:

- Sandbox webhook source: `54.179.156.147`
- Production webhook sources: `3.1.13.32`, `52.77.254.34`

The API must remain reachable only through the configured Cloudflare Tunnel so
that `CF-Connecting-IP` is supplied by the trusted edge rather than an
untrusted direct client.

## Hard gates before secret installation

All gates must be true:

- HitPay production account verification is approved.
- Required production payment methods are enabled.
- The current stable server egress IPv4 is present in the HitPay production API
  whitelist.
- Three active production recurring plans exist: Personal Pro RM9, Family RM19,
  and Business RM49, billed in MYR with the intended recurring cycle.
- The production API key, API salt, webhook salt, and all three production plan
  IDs are available at the same maintenance window.
- The production webhook is registered in the HitPay dashboard with the exact
  production URL and these events: `charge.created`, `charge.failed`,
  `recurring_billing.method_attached`, `recurring_billing.method_detached`, and
  `recurring_billing.subscription_updated`.
- A named operator has approved the maintenance window and rollback owner.

Do not copy sandbox credentials or sandbox plan IDs into the production
configuration. Do not install only part of the production configuration.

## Read-only preflight

Run from the server. These checks do not reveal credential values.

```bash
cd /opt/imai || exit 1

git status -sb
systemctl is-active mypocket.service
systemctl is-active imai-web.service
systemctl show mypocket.service -p NRestarts --value

curl -fsS http://127.0.0.1:3000/api/v1/health >/dev/null
curl -fsS https://api.imai.my/api/v1/health >/dev/null

printf 'OUTBOUND_PUBLIC_IPV4:'
curl -4 -fsS --max-time 15 https://api.ipify.org
printf '\n'
```

Confirm that the printed IPv4 is present in the production API whitelist. If
the address is dynamic or does not match, stop the cutover.

## Atomic secret installation

This step writes all production settings together, creates a mode-preserving
backup, and does not restart the API. Paste values only at the hidden prompts.

```bash
cd /opt/imai || exit 1
umask 077

read -r -s -p "Production HITPAY_API_KEY: " IMAI_HITPAY_API_KEY; printf '\n'
read -r -s -p "Production HITPAY_SALT: " IMAI_HITPAY_SALT; printf '\n'
read -r -s -p "Production HITPAY_WEBHOOK_SALT: " IMAI_HITPAY_WEBHOOK_SALT; printf '\n'
read -r -p "Production Personal Pro RM9 plan ID: " IMAI_HITPAY_PLAN_PERSONAL_PRO_ID
read -r -p "Production Family RM19 plan ID: " IMAI_HITPAY_PLAN_FAMILY_ID
read -r -p "Production Business RM49 plan ID: " IMAI_HITPAY_PLAN_BUSINESS_ID

export IMAI_HITPAY_API_KEY IMAI_HITPAY_SALT IMAI_HITPAY_WEBHOOK_SALT
export IMAI_HITPAY_PLAN_PERSONAL_PRO_ID IMAI_HITPAY_PLAN_FAMILY_ID
export IMAI_HITPAY_PLAN_BUSINESS_ID

IMAI_HITPAY_BACKUP="/opt/imai/.env.backup-hitpay-production-$(date +%Y%m%d-%H%M%S)"
cp -p /opt/imai/.env "$IMAI_HITPAY_BACKUP"

node --input-type=module <<'NODE'
import { readFileSync, writeFileSync } from "node:fs";

const path = "/opt/imai/.env";
const lines = readFileSync(path, "utf8").split(/\r?\n/);
const updates = new Map([
  ["HITPAY_ENVIRONMENT", "production"],
  ["HITPAY_API_BASE_URL", "https://api.hit-pay.com"],
  ["HITPAY_API_KEY", process.env.IMAI_HITPAY_API_KEY],
  ["HITPAY_SALT", process.env.IMAI_HITPAY_SALT],
  ["HITPAY_WEBHOOK_SALT", process.env.IMAI_HITPAY_WEBHOOK_SALT],
  [
    "HITPAY_WEBHOOK_URL",
    "https://api.imai.my/api/v1/billing/hitpay/webhook/production",
  ],
  ["HITPAY_RETURN_URL", "https://app.imai.my/billing/hitpay/return"],
  [
    "HITPAY_PLAN_PERSONAL_PRO_ID",
    process.env.IMAI_HITPAY_PLAN_PERSONAL_PRO_ID,
  ],
  ["HITPAY_PLAN_FAMILY_ID", process.env.IMAI_HITPAY_PLAN_FAMILY_ID],
  ["HITPAY_PLAN_BUSINESS_ID", process.env.IMAI_HITPAY_PLAN_BUSINESS_ID],
]);

for (const [name, value] of updates) {
  if (!String(value ?? "").trim()) {
    throw new Error(`${name} is empty; configuration was not written`);
  }
}

const seen = new Set();
const next = lines.map((line) => {
  const separator = line.indexOf("=");
  if (separator < 1) return line;
  const name = line.slice(0, separator);
  if (!updates.has(name)) return line;
  seen.add(name);
  return `${name}=${JSON.stringify(updates.get(name))}`;
});

for (const [name, value] of updates) {
  if (!seen.has(name)) next.push(`${name}=${JSON.stringify(value)}`);
}

writeFileSync(path, `${next.join("\n").replace(/\n+$/, "")}\n`, {
  mode: 0o600,
});
NODE

unset IMAI_HITPAY_API_KEY IMAI_HITPAY_SALT IMAI_HITPAY_WEBHOOK_SALT
unset IMAI_HITPAY_PLAN_PERSONAL_PRO_ID IMAI_HITPAY_PLAN_FAMILY_ID
unset IMAI_HITPAY_PLAN_BUSINESS_ID

printf 'BACKUP_PATH:%s\n' "$IMAI_HITPAY_BACKUP"
```

Record the backup path in the change log. Never paste secret values into the
change log, terminal history, screenshots, chat, or Git.

## Pre-restart validation

The API is still using its old in-memory sandbox configuration at this point.
Validate the new file in a separate process before any restart:

```bash
cd /opt/imai/apps/api || exit 1

node --import tsx --input-type=module <<'NODE'
import { env } from "./src/config/index.ts";

const names = [
  "HITPAY_API_KEY",
  "HITPAY_SALT",
  "HITPAY_WEBHOOK_SALT",
  "HITPAY_PLAN_PERSONAL_PRO_ID",
  "HITPAY_PLAN_FAMILY_ID",
  "HITPAY_PLAN_BUSINESS_ID",
];

console.log(`HITPAY_ENVIRONMENT:${env.HITPAY_ENVIRONMENT}`);
console.log(`HITPAY_API_BASE_URL:${env.HITPAY_API_BASE_URL}`);
console.log(`HITPAY_WEBHOOK_URL:${env.HITPAY_WEBHOOK_URL}`);
for (const name of names) {
  console.log(`${name}:${String(env[name]).length > 0 ? "PRESENT" : "EMPTY"}`);
}
NODE

node --import tsx --input-type=module <<'NODE'
import { HitPayClient } from "./src/modules/billing/hitpay.client.ts";

const response = await new HitPayClient().request({
  method: "GET",
  path: "/v1/subscription-plan",
});
console.log(`HITPAY_PRODUCTION_READ_ONLY_HTTP:${response.status}`);
if (response.status !== 200) process.exitCode = 1;
NODE
```

Stop if validation or the read-only API request fails. Do not restart the
service and do not create, update, or cancel a provider object while diagnosing.

## Controlled restart and canary

This phase requires explicit cutover approval.

```bash
cd /opt/imai || exit 1

pnpm --filter @imai/api test
pnpm --filter @imai/api build
pnpm --filter @imai/web build

sudo systemctl restart mypocket.service

systemctl is-active mypocket.service
systemctl show mypocket.service -p NRestarts --value
curl -fsS http://127.0.0.1:3000/api/v1/health >/dev/null
curl -fsS https://api.imai.my/api/v1/health >/dev/null

journalctl -u mypocket.service --since "5 minutes ago" --no-pager \
  | grep -Ei "error|exception|failed|hitpay|zod" \
  | tail -100 || true
```

Before any payment, verify from application route evidence that the production
webhook route exists and the sandbox webhook route is absent.

## Rollback

Rollback is required if startup, health, read-only API access, route isolation,
or webhook validation fails. Use the exact backup path printed during secret
installation.

```bash
cd /opt/imai || exit 1

IMAI_HITPAY_BACKUP="/opt/imai/.env.backup-hitpay-production-YYYYMMDD-HHMMSS"
case "$IMAI_HITPAY_BACKUP" in
  /opt/imai/.env.backup-hitpay-production-*) ;;
  *) echo "Invalid rollback path" >&2; exit 1 ;;
esac

test -f "$IMAI_HITPAY_BACKUP"
cp -p "$IMAI_HITPAY_BACKUP" /opt/imai/.env
sudo systemctl restart mypocket.service

systemctl is-active mypocket.service
curl -fsS http://127.0.0.1:3000/api/v1/health >/dev/null
curl -fsS https://api.imai.my/api/v1/health >/dev/null
```

After rollback, confirm that sandbox API access and the sandbox-only webhook
route are restored. Keep the failed production configuration backup for audit;
do not commit any `.env` or backup file.

## Minimal production proof and reconciliation

Run the MyPocket-side audit first. It is read-only and prints only counts,
statuses, and hashed record fingerprints:

```bash
cd /opt/imai/apps/api || exit 1
node --import tsx scripts/audit-hitpay-reconciliation.ts \
  | tee "/tmp/hitpay-reconciliation-$(date +%Y%m%d-%H%M%S).json"
```

The report must say `mutationPerformed: false`. Review these groups:

- `anomalies.billing`: stale checkout rows, active rows without a provider
  subscription ID, or active rows without a successful payment.
- `anomalies.webhook`: processing errors, old unprocessed events, or provider
  events that could not be mapped to a MyPocket billing row.
- `anomalies.access`: differences between billing status/plan, the owner's
  access subscription, and workspace type.

Then compare the report with read-only production views in the HitPay dashboard:

| Provider state | MyPocket state | Classification |
| --- | --- | --- |
| Recurring subscription exists | Matching billing row exists | Reconcile plan, status, customer, and last charge |
| Recurring subscription exists | No matching billing row | Provider orphan; record fingerprints and stop |
| No recurring subscription | Active/scheduled MyPocket row exists | MyPocket orphan; block proof and investigate |
| Both exist but amount, currency, plan, or status differs | Any | Contract mismatch; block proof and investigate |
| Signed event is unmapped | No matching row | Preserve as audit evidence; never auto-link by guess |

Do not repair, cancel, recreate, or relink a provider object from this audit.
Provider mutations require a separate approval that names the exact redacted
fingerprints and expected result.

The proof is a separate, explicitly approved action after all canaries pass:

1. Use one named test customer and the minimum intended paid plan.
2. Record the checkout/reference ID before payment.
3. Complete one real payment.
4. Reconcile the HitPay charge, webhook event, MyPocket billing row, workspace
   package/access state, and user-facing confirmation.
5. Confirm duplicate webhook delivery is idempotent.
6. Record provider IDs only as redacted fingerprints in operational notes.
7. Stop and roll back if the amount, currency, plan, customer, webhook
   signature, or resulting entitlement differs from the approved proof.

Never repair a mismatch by creating or cancelling provider subscriptions during
reconciliation without a separate, explicit approval.
