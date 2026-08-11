# Sprint K — Evolution AI readiness

Date: 2026-08-11
Baseline: `9927fcf8be749b74e3147a53c86d2664c0abf1fd`
Branch/worktree: `codex/sprint-k-evolution-ai` / `/tmp/imai-sprint-k`

## Decision

The readiness and boundary audit can close, but enabling provider-assisted text parsing in the runtime is **NO-GO** for now.

The safe current behavior remains deterministic. `WhatsAppService` constructs `AIProviderRouter` with no text providers, so the existing Groq text adapter is dormant. The fake-provider benchmark proves the routing seam and structured-output contract only; it does not prove a real model's accuracy, network latency, or cost.

## Responsibility inventory

| Component | Responsibility | Must not do |
| --- | --- | --- |
| Evolution API | WhatsApp connection, webhook transport, text/media envelope, media download and reply delivery | Decide authorization, own financial state, or write transactions |
| MyPocket WhatsApp service | Trigger/alias handling, actor lookup, workspace and role checks, deterministic command routing, isolated draft state, validation, execution and replies | Trust an AI result without the normal workspace/role boundary |
| AI provider router | Try configured text providers, return structured value plus attempt status, fall back deterministically | Access Prisma, transaction/commitment services, Sheets or Drive |
| Groq text adapter | Convert one text message into a normalized transaction candidate | Execute financial writes or process receipt images |
| Receipt pipeline | Separate Evolution media, vision extraction, one-minute draft and explicit confirmation boundary | Reuse the text provider or upload an unconfirmed image |

## Benchmark

Fixture: 18 post-trigger BM/Manglish messages covering help, summary/search/latest queries, delete, edit/correction, commitment create/list/archive/paid, expense, income and word-form amounts.

| Path | Correct | Accuracy | Provider calls per run | Input characters sent per run |
| --- | ---: | ---: | ---: | ---: |
| Current Evolution normalization + deterministic MyPocket parser | 15/18 | 83.33% | 0 | 0 |
| Evolution normalization + one deterministic fake text provider | 18/18 | 100% simulated ceiling | 7 | 200 |

The current parser intentionally failed the three word-form amount fixtures: `dua belas`, `seratus`, and `ninety`. The one-provider result is a controlled fixture result, not evidence of Groq model quality.

Process-local mean timings from a representative focused run were approximately 0.04–0.09 ms/message for the current path and 0.02 ms/message for the fake-provider path. These numbers exclude network and model inference and therefore must not be used for capacity or SLA decisions. Real provider cost was not measured; the only durable cost evidence is seven potential billable calls for seven transaction messages, while command/query messages made no provider call.

## Root-cause fix found by the benchmark

Before the fix, `bayar bil elektrik ninety ringgit` was classified as `commitment:mark_paid` because the commitment matcher accepted any message beginning with `bayar` or `pay`. That could divert an ordinary expense away from transaction parsing.

The matcher now requires explicit commitment semantics:

- `bayar komitmen astro` and `selesai reminder internet` remain valid;
- `pay commitment rent` remains valid;
- ordinary expenses beginning with `bayar` or `pay` continue to transaction parsing;
- the guided `!paycommitment` flow is unchanged.

## K1–K12 evidence

| Item | Status | Fresh evidence |
| --- | --- | --- |
| K1 responsibility inventory | Confirmed | Component and write-boundary map above |
| K2 BM/Manglish benchmark | Confirmed | 18 deterministic fixtures; repeatable test report |
| K3 query/commitment/delete/edit/correction intents | Confirmed | Benchmark plus explicit role-gate contract; paid-intent regression fixed |
| K4 multi-turn isolation | Confirmed for current flows | Commitment, pay-commitment and receipt draft keys contain both workspace and actor; no general generative-AI memory exists |
| K5 help read-only | Confirmed | Evolution webhook help test produced a reply with zero financial writes |
| K6 commitment/income boundary | Confirmed | Pure parsing evidence plus MyPocket role/execution ownership contract |
| K7 router/provider comparison | Partial | Accuracy, local overhead, structured attempts and call count measured with a fake provider; real latency/accuracy/cost unverified |
| K8 receipt boundary unchanged | Confirmed | Text provider has no receipt/storage dependency; receipt still uses its vision interface and confirmation TTL |
| K9 no direct AI financial writes | Confirmed | Router/provider dependency contract rejects Prisma and transaction/commitment service access |
| K10 observability/regression | Partial | Router attempt statuses and 41-test relevant regression pass; runtime does not yet persist or emit provider-attempt telemetry |
| K11 no canary/deploy | Confirmed | Work remained in isolated worktree; no service, live DB, provider config or deployment action |
| K12 closure decision | NO-GO for enablement | Real provider benchmark, production-safe telemetry and explicit runtime configuration remain required |

## Verification

- Sprint K focused contracts: 7/7 passed.
- Neighboring router, transaction parser, delete, snapshot isolation and receipt tests: 41/41 passed including Sprint K tests.
- Full API regression suite with isolated dummy configuration: 148/148 passed.
- API TypeScript build: passed.
- `git diff --check`: passed.

All tests used dummy configuration and a deterministic fake text provider. No external AI request, provider mutation, database connection, service restart, canary, deployment, commit or push occurred.

## Enablement gates

Do not wire the Groq text provider into the runtime until all of these are approved and demonstrated:

1. A real-provider BM/Manglish evaluation on a redacted, consented dataset with target accuracy and error classes.
2. Timeout, retry, latency and spend budgets, including an explicit maximum provider-call policy.
3. Structured provider-attempt telemetry that excludes message text, credentials and personal data.
4. Schema/category validation before a provider candidate reaches MyPocket execution.
5. A rollout and rollback plan that keeps deterministic parsing available.
