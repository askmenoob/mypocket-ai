# Google Sheet Template Upgrade

Status: DEPLOYMENT READY (2026-08-12)

## Template design and safety

- [x] Back up the original Personal, Family, and Business master templates.
- [x] Apply the MyPocket financial-ledger design system to every master template.
- [x] Add a first-tab `Start Here` guide and preserve every existing full-plan tab.
- [x] Keep the production timezone at `Asia/Kuala_Lumpur`.
- [x] Extend `Transactions` to A:P with `Receipt Reference` as column P.
- [x] Verify the four master template headers directly in Google Sheets.

## Plan-aware templates

- [x] Create a limited Personal Basic template with core tabs only: Start Here, Dashboard, Transactions, Categories, Settings, and _System_Log.
- [x] Preserve the full Personal Pro reporting, receipt, commitment, and LHDN tabs.
- [x] Select Personal Basic by default when Personal Pro access is not active.
- [x] Select Personal Pro only for an active Personal Pro billing subscription in ACTIVE, PAYMENT_DUE, or GRACE access.
- [x] Use explicit `basic-*` and `pro-*` master-template versions so selection is deterministic.
- [x] Keep Family and Business on their full dedicated templates.

## Receipt reference integrity

- [x] Prefer reference number, then receipt number, then invoice number during receipt recognition.
- [x] Persist the selected value in `Transaction.receiptReference`.
- [x] Display Receipt Reference in the dashboard Transactions view.
- [x] Write Receipt Reference to Google Sheet column P during normal receipt sync.
- [x] Preserve Receipt Reference during manual reconciliation and historical backfill.
- [x] Expand template migration validation and snapshots from A:O to A:P.

## Verification and rollout

- [x] Focused plan-selection and receipt-reference tests pass.
- [x] API TypeScript build passes.
- [ ] Seed the four production master-template records after the API deployment gate.
- [ ] Restart the API only; do not restart the web service or rerun unrelated migrations.
- [ ] Verify a fresh Personal Basic workspace provisions the limited template.
- [ ] Verify an active Personal Pro workspace provisions the full template.
- [ ] Scan and confirm one receipt with an invoice number; verify dashboard and Google Sheet column P.
- [ ] Commit and push the implementation branch.

## Master template inventory

| Plan | Master spreadsheet ID |
|---|---|
| Personal Basic | `1Ubyi5pXp0uVSfk607Dg8WCWxCyi9a4B42aapeY0JSGk` |
| Personal Pro | `1cwwVOaoWZqqjdIdhLKUG1qESY542pi-QngevvDR2yw4` |
| Family | `1-gSl3x2R7OkKOJDyDLdW0eZS9Nd_XuxQlGbV1CCCik4` |
| Business | `1ECzdINGhzv9GnDrIKuakAfyzqx1wHMJ-0uYcPo0tPUA` |
