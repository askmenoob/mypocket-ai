import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTransactionSnapshot,
  compareTemplateVersions,
  findTemplateSettingRow,
  parseTemplateSettings,
  sameTransactionSnapshot,
} from "../../src/modules/google/templates/template-update.utils.js";


test(
  "compares semantic template versions",
  () => {

    assert.equal(
      compareTemplateVersions(
        "1.0.0",
        "1.1.0",
      ),
      -1,
    );

    assert.equal(
      compareTemplateVersions(
        "1.1",
        "1.1.0",
      ),
      0,
    );

    assert.equal(
      compareTemplateVersions(
        "1.2.0",
        "1.1.9",
      ),
      1,
    );

  },
);


test(
  "reads Settings rows without relying on order",
  () => {

    const rows = [
      [
        "Platform",
        "MyPocket AI",
      ],
      [
        "Version",
        "1.0.0",
      ],
      [
        "Workspace Type",
        "PERSONAL",
      ],
    ];

    const settings =
      parseTemplateSettings(
        rows,
      );

    assert.equal(
      settings.version,
      "1.0.0",
    );

    assert.equal(
      settings["workspace type"],
      "PERSONAL",
    );

    assert.equal(
      findTemplateSettingRow(
        rows,
        "Version",
      ),
      2,
    );

  },
);


test(
  "transaction snapshot preserves IDs, count and total",
  () => {

    const before = [
      [
        "Transaction ID",
        "Date",
        "Time",
        "Type",
        "Category",
        "Merchant",
        "Description",
        "Amount",
        "Payment Method",
        "Source",
        "AI Confidence",
        "Receipt URL",
        "Created At",
        "Created By ID",
        "Created By Email",
      ],
      [
        "txn-2",
        "",
        "",
        "EXPENSE",
        "",
        "",
        "",
        "10.50",
      ],
      [
        "txn-1",
        "",
        "",
        "INCOME",
        "",
        "",
        "",
        "1,000.00",
      ],
    ];

    const after = [
      before[0],
      before[2],
      before[1],
    ];

    const beforeSnapshot =
      buildTransactionSnapshot(
        before,
      );

    const afterSnapshot =
      buildTransactionSnapshot(
        after,
      );

    assert.equal(
      beforeSnapshot.recordCount,
      2,
    );

    assert.equal(
      beforeSnapshot.totalAmountCents,
      101050,
    );

    assert.deepEqual(
      beforeSnapshot.duplicateIds,
      [],
    );

    assert.equal(
      sameTransactionSnapshot(
        beforeSnapshot,
        afterSnapshot,
      ),
      true,
    );

  },
);


test(
  "detects duplicate transaction IDs",
  () => {

    const snapshot =
      buildTransactionSnapshot([
        [
          "Transaction ID",
          "Date",
          "Time",
          "Type",
          "Category",
          "Merchant",
          "Description",
          "Amount",
        ],
        [
          "txn-1",
          "",
          "",
          "",
          "",
          "",
          "",
          "1",
        ],
        [
          "txn-1",
          "",
          "",
          "",
          "",
          "",
          "",
          "2",
        ],
      ]);

    assert.deepEqual(
      snapshot.duplicateIds,
      [
        "txn-1",
      ],
    );

  },
);
