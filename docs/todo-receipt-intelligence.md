# Sprint Q — Receipt Intelligence 2.0

Status: **DEPLOYED — 2026-08-14**
Priority rule: Sprint P remains the live-money release track. Sprint Q must not
change billing access or the `!confirm` persistence boundary.

## A. Current architecture (audited)

```text
Evolution webhook
  -> message normalization (text/audio/image/document/video metadata only)
  -> registered instance + workspace lookup
  -> linked actor and billing-access check
  -> receipt media download
  -> Groq receipt extraction/classification
  -> in-memory receipt draft (5 minutes)
  -> !confirm
  -> Google Drive receipt upload
  -> Transaction + Google Sheet sync
  -> WhatsApp confirmation
```

Existing strengths preserved:

- Evolution media download is bounded and fail-closed.
- Workspace/actor authorization happens before financial execution.
- Receipt bytes stay in memory until confirmation and expire after five minutes.
- Drive, Transaction and Google Sheet writes occur only after `!confirm`.
- Receipt reference priority remains Reference No > Receipt No > Invoice No.

## B. Risk proven by audit

Without an early intent gate, normal group images could enter actor lookup,
download and Vision work. Treating all images/PDFs as receipts creates privacy,
cost, latency and false-transaction risk. A filename or MIME type cannot prove
that media is a completed transaction.

## C. Smallest safe integration points

1. `handleEvolutionMediaWebhook`: run a pure Media Intent Router after the
   registered instance is known but before actor lookup, billing, download or AI.
2. `WhatsAppReceiptPipeline.process`: validate untrusted image bytes, classify
   RECEIPT/NOT_RECEIPT fail-closed, then invoke the local scanner only for a
   classified receipt.
3. `handleReceiptDraftMessage`: store and record only after `!confirm`; send the
   clean PDF best-effort after the transaction succeeds.

## D. Proposed/implemented flow

```text
WhatsApp -> Evolution -> normalize metadata
  -> Media Intent Router
       group image without !/alias + receipt intent -> silent IGNORE
       video/document without supported receipt flow -> silent IGNORE
       private image or explicitly addressed group receipt -> continue
  -> linked actor + billing access
  -> bounded media download + MIME/signature validation
  -> Groq documentKind + visible receipt evidence
       NOT_RECEIPT -> silent IGNORE, zero scanner/write
       RECEIPT -> local crop/deskew/enhance -> clean PDF
  -> in-memory draft
  -> !confirm -> Drive PDF -> Transaction/Sheet -> confirmation + PDF reply
```

## E. Files affected

CREATE:

- `apps/api/src/modules/whatsapp/whatsapp-media-intent.router.ts`
- `apps/api/src/modules/whatsapp/receipt-image.scanner.ts`
- `apps/api/tests/receipt-image.scanner.test.ts`

MODIFY:

- `apps/api/src/modules/whatsapp/whatsapp.service.ts`
- `apps/api/src/modules/whatsapp/whatsapp-receipt.pipeline.ts`
- `apps/api/src/modules/intelligence/groq-vision.provider.ts`
- focused WhatsApp/receipt/Groq tests
- `apps/api/package.json` and `pnpm-lock.yaml`

NO CHANGE:

- Transaction service/accounting rules
- Google Drive ownership/storage architecture
- Google Sheet synchronization contract
- billing migrations/runtime configuration
- `!confirm` as the only persistence boundary

## F. Minimum dependencies

- `sharp`: local signature-bounded auto-orient, background trim, deskew,
  grayscale/contrast/sharpen and PNG encoding.
- `pdf-lib`: local one-page PDF generation.

No GPU, paid scanner service, OpenCV, Pillow or temporary-file dependency was
added. Processing is in memory with sanitized filenames.

## G. Incremental implementation checklist

- [x] Q1 Audit webhook, media, receipt, storage, transaction and tests.
- [x] Q2 Group images require `!` or configured alias plus receipt intent before
  actor lookup/download/AI.
- [x] Q3 Groq returns fail-closed `RECEIPT` or `NOT_RECEIPT` with directly visible
  receipt evidence.
- [x] Q4 Ordinary photos/videos/documents are silently ignored; no transaction.
- [x] Q5 Smart scanner validates size/signature, bounds scanner CPU/memory,
  auto-orients, detects four corners, applies local homography, trims background,
  estimates deskew and enhances readability.
- [x] Q6 Valid PDF is generated and returned best-effort after `!confirm`; send
  failure cannot roll back a confirmed transaction.
- [x] Q7 Draft reply shows confidence and visible evidence; user can correct
  amount, merchant, category, date, reference or details before `!confirm`
  without resetting the five-minute expiry.
- [x] Q8 Existing AEON/Shell/MANKON/TL/Jumlah regression corpus and idempotency
  pass. Three owner-provided photographed receipts were verified privately in
  memory (valid enhanced image + PDF); no private image/content entered Git.
- [x] Q9 No Drive/Transaction/Sheet write before `!confirm`; five-minute expiry and
  in-memory cleanup retained.
- [x] Q10 Merchant/category/total/date/reference parity passes; privacy-safe
  aggregate counters track incoming/ignored/classified/scanned/PDF work without
  phone numbers, message text, receipt content or media bytes.
- [x] Q11 Safe MVP boundary: ordinary PDFs/documents remain silent-ignore before
  actor lookup/download/AI. PDF receipt vs unpaid invoice/commitment routing is
  explicitly deferred as a future accounting capability because the current
  stack has no audited PDF text/OCR parser and `pdf-lib` is generation-only.
- [x] Q12 Receipt UX: workspace Owner/Admin may choose cleaned PDF or PNG in Bot
  Settings; compatibility default is PDF, the draft window is five minutes, and
  neither format is uploaded before `!confirm`. Additive schema/migration and
  regenerated Prisma client validate; 26/26 focused, 271/271 full API and 32/32
  web tests pass; API/web production builds pass. Commit `b8e6f8b` was deployed,
  the additive migration is applied, and API/web runtime checks are green.

## H. Verification evidence

- Focused media/Groq/scanner/receipt suite: **49/49 PASS**.
- Full API suite after aggregate observability: **266/266 PASS**.
- API TypeScript build: **PASS**.
- `git diff --check`: **PASS** (line-ending warnings only).
- Production deployment completed from commit `b8e6f8b`; the additive receipt
  preference migration is applied. API, readiness, app and public landing checks
  returned HTTP 200. CHIP remains intentionally in test mode.
- [x] Q13 Groq resilience hotfix: Qwen vision reasoning is disabled for strict
  JSON extraction, completion size is bounded, malformed output receives one
  concise fail-closed retry, short `429` responses honor `retry-after`, and bot
  replies now distinguish temporary AI/provider failures from poor image
  quality. Receipt/media/voice regression tests pass 78/78; the complete API
  suite passes 275/275 and the API TypeScript build passes.

The image-receipt MVP is green. Generic PDF/invoice automation is outside this
MVP and remains fail-closed until a future accounting design can prove whether
a document is paid evidence or an amount still due.
