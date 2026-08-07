import assert from "node:assert/strict";
import test from "node:test";


import {
  TransactionService,
} from "../src/modules/transaction/transaction.service.js";


type HarnessOptions = {
  failBackupUpdate?:boolean;
  primaryRows?:unknown[][];
  backupRows?:unknown[][];
};


function transactionRow(
  id:string,
  description:string,
){
  return [
    id,
    "2026-08-07",
    "01:00:00",
    "EXPENSE",
    "Food",
    "Merchant",
    description,
    "10.00",
    "Cash",
    "WHATSAPP",
    "",
    "",
    "2026-08-07T01:00:00.000Z",
    "user-a",
    "user@example.com",
  ];
}


function headerRow(){
  return [
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
    "Receipt URL",
    "",
    "Created At",
    "Created By ID",
    "Created By Email",
  ];
}


function createHarness(
  options:HarnessOptions = {},
){

  let failBackupUpdate =
    options.failBackupUpdate
    ??
    false;

  const rowsBySheet =
    new Map<string, unknown[][]>([
      [
        "sheet-primary",
        options.primaryRows
        ??
        [
          headerRow(),
          transactionRow(
            "cm-one",
            "coffee",
          ),
          transactionRow(
            "cm-two",
            "lunch",
          ),
        ],
      ],
      [
        "sheet-backup",
        options.backupRows
        ??
        [
          headerRow(),
          transactionRow(
            "cm-one",
            "coffee",
          ),
          transactionRow(
            "cm-two",
            "lunch",
          ),
        ],
      ],
    ]);

  let updateCount =
    0;

  const service =
    Object.create(
      TransactionService.prototype,
    ) as any;

  service.googleSettingsRepository = {
    findByWorkspaceId:
      async () => ({
        spreadsheetId:
          "sheet-primary",

        backupSpreadsheetId:
          "sheet-backup",
      }),
  };

  service.sheetsService = {

    readRange:
      async (
        _workspaceId:string,
        request:{
          spreadsheetId:string;
        },
      ) => {

        return rowsBySheet.get(
          request.spreadsheetId,
        )
        ??
        [];

      },

    updateRange:
      async (
        _workspaceId:string,
        request:{
          spreadsheetId:string;
          range:string;
          values:unknown[][];
        },
      ) => {

        if(
          request.spreadsheetId
            ===
            "sheet-backup"
          &&
          failBackupUpdate
        ){

          throw new Error(
            "SIMULATED_BACKUP_DELETE_FAILURE",
          );

        }


        const rowMatch =
          request.range.match(
            /^Transactions!G(\d+):G\1$/,
          );

        if(!rowMatch){

          throw new Error(
            `UNEXPECTED_RANGE:${request.range}`,
          );

        }


        const rowIndex =
          Number(
            rowMatch[1],
          )
          -
          1;

        const rows =
          rowsBySheet.get(
            request.spreadsheetId,
          );

        if(!rows?.[rowIndex]){

          throw new Error(
            "ROW_NOT_FOUND",
          );

        }


        rows[rowIndex][6] =
          request.values?.[0]?.[0]
          ??
          "";

        updateCount +=
          1;

      },

  };


  return {

    service:
      service as TransactionService,

    rowsBySheet,

    updateCount:
      () => updateCount,

    allowBackupUpdate:
      () => {

        failBackupUpdate =
          false;

      },

  };

}


test(
  "bulk delete is restricted to Owner and Admin",
  async () => {

    const harness =
      createHarness();


    await assert.rejects(
      () =>
        harness.service
          .bulkDeleteSheetTransactions(
            "MEMBER",
            "workspace-a",
            [
              "cm-one",
            ],
          ),
      /Not allowed to delete transactions/,
    );

  },
);


test(
  "marks selected transactions deleted in primary and backup sheets",
  async () => {

    const harness =
      createHarness();


    const result =
      await harness.service
        .bulkDeleteSheetTransactions(
          "ADMIN",
          "workspace-a",
          [
            "cm-one",
            "cm-two",
          ],
        );


    assert.equal(
      result.deletedCount,
      2,
    );

    assert.deepEqual(
      result.missingIds,
      [],
    );


    for(
      const spreadsheetId
      of [
        "sheet-primary",
        "sheet-backup",
      ]
    ){

      const rows =
        harness.rowsBySheet.get(
          spreadsheetId,
        )!;

      assert.match(
        String(
          rows[1][6],
        ),
        /^\[DELETED\]/,
      );

      assert.match(
        String(
          rows[2][6],
        ),
        /^\[DELETED\]/,
      );

    }

  },
);


test(
  "retry repairs backup after partial bulk delete failure without double marker",
  async () => {

    const harness =
      createHarness({
        failBackupUpdate:
          true,
      });


    await assert.rejects(
      () =>
        harness.service
          .bulkDeleteSheetTransactions(
            "OWNER",
            "workspace-a",
            [
              "cm-one",
            ],
          ),
      /SIMULATED_BACKUP_DELETE_FAILURE/,
    );


    const primaryRows =
      harness.rowsBySheet.get(
        "sheet-primary",
      )!;

    const backupRows =
      harness.rowsBySheet.get(
        "sheet-backup",
      )!;


    assert.equal(
      primaryRows[1][6],
      "[DELETED] coffee",
    );

    assert.equal(
      backupRows[1][6],
      "coffee",
    );


    harness.allowBackupUpdate();


    const result =
      await harness.service
        .bulkDeleteSheetTransactions(
          "OWNER",
          "workspace-a",
          [
            "cm-one",
          ],
        );


    assert.equal(
      result.deletedCount,
      1,
    );

    assert.equal(
      primaryRows[1][6],
      "[DELETED] coffee",
    );

    assert.equal(
      backupRows[1][6],
      "[DELETED] coffee",
    );

  },
);


test(
  "already deleted rows are treated as successful matches",
  async () => {

    const harness =
      createHarness({
        primaryRows:[
          headerRow(),
          transactionRow(
            "cm-one",
            "[DELETED] coffee",
          ),
        ],
        backupRows:[
          headerRow(),
          transactionRow(
            "cm-one",
            "[DELETED] coffee",
          ),
        ],
      });


    const result =
      await harness.service
        .bulkDeleteSheetTransactions(
          "ADMIN",
          "workspace-a",
          [
            "cm-one",
          ],
        );


    assert.equal(
      result.deletedCount,
      1,
    );

    assert.equal(
      harness.updateCount(),
      0,
    );

  },
);


test(
  "returns missing ids without mutating unrelated rows",
  async () => {

    const harness =
      createHarness();


    const result =
      await harness.service
        .bulkDeleteSheetTransactions(
          "OWNER",
          "workspace-a",
          [
            "cm-missing",
          ],
        );


    assert.equal(
      result.deletedCount,
      0,
    );

    assert.deepEqual(
      result.missingIds,
      [
        "cm-missing",
      ],
    );

    assert.equal(
      harness.updateCount(),
      0,
    );

  },
);


test(
  "deleted sheet rows are excluded from active transaction parsing",
  () => {

    const service =
      Object.create(
        TransactionService.prototype,
      ) as any;


    assert.equal(
      service.parseSheetTransactionRow(
        transactionRow(
          "cm-one",
          "[DELETED] coffee",
        ),
      ),
      null,
    );

  },
);
