import assert from "node:assert/strict";
import test from "node:test";

import {
  TransactionSyncService,
} from "../src/modules/transaction/transaction-sync.service.js";


test(
  "writes confirmed receipt data to Transactions and Receipts Checklist only",
  async () => {
    const app = {
      prisma:{},
    };

    const service =
      new TransactionSyncService(
        app as any,
      ) as any;

    service.settingsRepository = {
      findByWorkspaceId:async () => ({
        spreadsheetId:"sheet-main",
        backupSpreadsheetId:"sheet-backup",
      }),
    };

    const appends:Array<{
      spreadsheetId:string;
      range:string;
      values:unknown[];
    }> = [];

    service.sheetsService = {
      getSheetTitles:async () => [
        "Categories",
        "Dashboard",
        "Transactions",
        "Tax Summary",
        "Settings",
        "_System_Log",
        "LHDN Summary",
        "Tax Reliefs",
        "LHDN e-Invoice",
        "LHDN Mapping",
        "Receipts Checklist",
        "Commitments List",
        "Commitments Log",
      ],
      appendRow:async (_workspaceId:string, input:any) => {
        appends.push(input);
        return {updatedRange:""};
      },
    };

    await service.sync({
      workspaceId:"workspace-1",
      transactionId:"cmreceipt1",
      amount:"341.92",
      currency:"MYR",
      type:"EXPENSE",
      category:"Travel",
      merchant:"Shell",
      paymentMethod:"Card",
      description:"Fuel purchase",
      transactionDate:new Date("2026-07-17T06:12:00.000Z"),
      source:"WHATSAPP_RECEIPT",
      aiConfidence:0.94,
      receiptUrl:"https://drive.example/shell-receipt",
      receiptType:"FUEL",
      receiptClassificationSource:"EVIDENCE",
      createdById:"user-1",
      createdByEmail:"owner@example.com",
    });

    assert.deepEqual(
      appends.map((entry) => [
        entry.spreadsheetId,
        entry.range,
      ]),
      [
        ["sheet-main", "Transactions!A:O"],
        ["sheet-main", "Receipts Checklist!A:J"],
        ["sheet-backup", "Transactions!A:O"],
        ["sheet-backup", "Receipts Checklist!A:J"],
      ],
    );

    const transaction =
      appends[0].values;

    assert.equal(transaction[10], 0.94);
    assert.equal(
      transaction[11],
      "https://drive.example/shell-receipt",
    );

    const checklist =
      appends[1].values;

    assert.deepEqual(
      checklist.slice(0, 7),
      [
        2026,
        "2026-07-17",
        "cmreceipt1",
        "Shell",
        "Travel",
        "341.92",
        "https://drive.example/shell-receipt",
      ],
    );
    assert.equal(checklist[8], "REVIEW");
    assert.match(
      String(checklist[9]),
      /FUEL.*EVIDENCE/,
    );

    assert.equal(
      appends.some(
        (entry) =>
          /Dashboard|Summary|Reliefs|Mapping|Settings/.test(
            entry.range,
          ),
      ),
      false,
    );
  },
);
