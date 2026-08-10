import assert from "node:assert/strict";
import test from "node:test";

import {
  dashboardDateInputValue,
  dashboardPercentageChange,
  filterDashboardTransactions,
  rankDashboardExpenses,
  resolveDashboardDateRange,
  resolvePreviousDashboardDateRange,
  summarizeDashboardTransactions,
  topDashboardAmounts,
} from "../../web/src/dashboard-analytics.js";


const timeZone =
  "Asia/Kuala_Lumpur";
const referenceDate =
  new Date("2026-08-10T18:45:40.000Z");


test(
  "dashboard date ranges follow the configured workspace timezone",
  () => {
    assert.equal(
      dashboardDateInputValue(
        referenceDate,
        timeZone,
      ),
      "2026-08-11",
    );

    const today =
      resolveDashboardDateRange(
        "TODAY",
        "",
        "",
        timeZone,
        referenceDate,
      );
    assert.equal(
      today.start?.toISOString(),
      "2026-08-10T16:00:00.000Z",
    );
    assert.equal(
      today.end?.toISOString(),
      "2026-08-11T16:00:00.000Z",
    );

    const month =
      resolveDashboardDateRange(
        "MONTH",
        "",
        "",
        timeZone,
        referenceDate,
      );
    assert.equal(
      month.start?.toISOString(),
      "2026-07-31T16:00:00.000Z",
    );
    assert.equal(
      month.end?.toISOString(),
      "2026-08-31T16:00:00.000Z",
    );

    const previousMonth =
      resolvePreviousDashboardDateRange(
        "MONTH",
        month,
        timeZone,
      );
    assert.ok(previousMonth);
    assert.equal(
      previousMonth.start?.toISOString(),
      "2026-06-30T16:00:00.000Z",
    );
    assert.equal(
      previousMonth.end?.toISOString(),
      month.start?.toISOString(),
    );

    assert.equal(
      resolvePreviousDashboardDateRange(
        "ALL",
        {
          start:null,
          end:null,
        },
        timeZone,
      ),
      null,
    );
  },
);


test(
  "custom dashboard ranges are inclusive by local calendar date",
  () => {
    const range =
      resolveDashboardDateRange(
        "CUSTOM",
        "2026-08-11",
        "2026-08-10",
        timeZone,
        referenceDate,
      );

    assert.equal(
      range.start?.toISOString(),
      "2026-08-09T16:00:00.000Z",
    );
    assert.equal(
      range.end?.toISOString(),
      "2026-08-11T16:00:00.000Z",
    );

    const filtered =
      filterDashboardTransactions(
        [
          {
            amount:1,
            type:"EXPENSE",
            transactionDate:"2026-08-09T15:59:59.999Z",
          },
          {
            amount:1,
            type:"EXPENSE",
            transactionDate:"2026-08-09T16:00:00.000Z",
          },
          {
            amount:1,
            type:"EXPENSE",
            transactionDate:"2026-08-11T15:59:59.999Z",
          },
          {
            amount:1,
            type:"EXPENSE",
            transactionDate:"2026-08-11T16:00:00.000Z",
          },
        ],
        range,
      );

    assert.deepEqual(
      filtered.map((item) => item.transactionDate),
      [
        "2026-08-09T16:00:00.000Z",
        "2026-08-11T15:59:59.999Z",
      ],
    );
  },
);


test(
  "dashboard summaries, comparisons and rankings reconcile independently",
  () => {
    const transactions = [
      {
        amount:"30.50",
        type:"EXPENSE",
        transactionDate:"2026-08-10T17:00:00.000Z",
        category:{ name:"Food" },
        merchant:{ name:"KFC" },
      },
      {
        amount:"19.50",
        type:"EXPENSE",
        transactionDate:"2026-08-10T18:00:00.000Z",
        category:{ name:"Food" },
        merchant:{ name:"Mamak" },
      },
      {
        amount:"3000",
        type:"INCOME",
        transactionDate:"2026-08-10T19:00:00.000Z",
        category:{ name:"Salary" },
        merchant:null,
      },
    ];

    assert.deepEqual(
      summarizeDashboardTransactions(transactions),
      {
        transactionCount:3,
        expenseCount:2,
        incomeCount:1,
        expense:50,
        income:3000,
        balance:2950,
      },
    );
    assert.equal(
      dashboardPercentageChange(150, 100),
      50,
    );
    assert.equal(
      dashboardPercentageChange(10, 0),
      null,
    );
    assert.deepEqual(
      rankDashboardExpenses(
        transactions,
        "category",
        "Others",
      ),
      [
        {
          name:"Food",
          amount:50,
        },
      ],
    );
    assert.deepEqual(
      topDashboardAmounts(
        rankDashboardExpenses(
          transactions,
          "merchant",
          "Unspecified",
        ),
        1,
        "Others",
      ),
      [
        {
          name:"KFC",
          amount:30.5,
        },
        {
          name:"Others",
          amount:19.5,
        },
      ],
    );
  },
);
