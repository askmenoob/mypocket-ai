# Sprint B — Finance Overview Slice

Date: 2026-08-03
Branch: `codex/prod-readiness-20260803`

## Scope

This slice starts Sprint B without schema changes. It upgrades the premium dashboard finance card from category-only spending into a monthly income allocation view.

## Current behavior

The dashboard combines data already loaded by the app:

- Google Sheet transactions from `/transactions/sheet`
- unpaid monthly commitments from `/commitments?status=unpaid`

## Calculations

```text
paidExpenses = sum(EXPENSE transactions in selected period)
income = sum(INCOME transactions in selected period)
unpaidCommitments = commitments.summary.totalUnpaid
committedOutflow = paidExpenses + unpaidCommitments
availableBalance = max(income - committedOutflow, 0)
deficit = max(committedOutflow - income, 0)
donutTotal = max(income, committedOutflow)
```

The donut never renders a negative slice. If commitments and paid expenses exceed income, the deficit is shown as a separate label.

## Not included yet

- fuzzy payment-to-commitment matching
- explicit `matchedTransactionId` schema
- confirmation flow for uncertain matches
- backend finance summary endpoint

Those belong to later Sprint B slices.
