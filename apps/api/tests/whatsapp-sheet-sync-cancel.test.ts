import assert from "node:assert/strict";
import test from "node:test";

import {
  WhatsAppSheetSyncService,
} from "../src/modules/whatsapp/whatsapp-sheet-sync.service.js";


function createHarness(
  input:{
    primaryDescription?:string;
    backupDescription?:string;
    includeBackup?:boolean;
    failBackupUpdate?:boolean;
  } = {},
){

  let primaryDescription =
    input.primaryDescription
    ??
    "coffee";

  let backupDescription =
    input.backupDescription
    ??
    "coffee";

  let failBackupUpdate =
    input.failBackupUpdate
    ??
    false;

  let updateCount =
    0;


  const service =
    Object.create(
      WhatsAppSheetSyncService.prototype,
    ) as any;


  service.app = {
    prisma:{
      workspaceGoogleSetting:{
        findUnique:
          async () => ({
            spreadsheetId:
              "sheet-primary",

            backupSpreadsheetId:
              input.includeBackup === false
                ? null
                : "sheet-backup",
          }),
      },
    },
  };


  service.sheetsService = {

    readRange:
      async (
        _workspaceId:string,
        request:{
          spreadsheetId:string;
        },
      ) => {

        const description =
          request.spreadsheetId
            === "sheet-primary"
              ? primaryDescription
              : backupDescription;


        return [
          [
            "id",
            "date",
            "time",
            "type",
            "category",
            "merchant",
            "description",
          ],
          [
            "cm-test-transaction",
            "",
            "",
            "EXPENSE",
            "",
            "",
            description,
          ],
        ];

      },


    updateRange:
      async (
        _workspaceId:string,
        request:{
          spreadsheetId:string;
          values:unknown[][];
        },
      ) => {

        updateCount +=
          1;


        if(
          request.spreadsheetId
            === "sheet-backup"
          &&
          failBackupUpdate
        ){

          throw new Error(
            "SIMULATED_BACKUP_UPDATE_FAILURE",
          );

        }


        const nextDescription =
          String(
            request.values?.[0]?.[0]
            ??
            "",
          );


        if(
          request.spreadsheetId
            === "sheet-primary"
        ){

          primaryDescription =
            nextDescription;

        }else{

          backupDescription =
            nextDescription;

        }

      },

  };


  return {
    service:
      service as WhatsAppSheetSyncService,

    state:
      () => ({
        primaryDescription,
        backupDescription,
        updateCount,
      }),

    allowBackupUpdate:
      () => {
        failBackupUpdate =
          false;
      },
  };

}


test(
  "repairs backup cancellation on retry after partial sync failure",
  async () => {

    const harness =
      createHarness({
        includeBackup:
          true,

        failBackupUpdate:
          true,
      });


    await assert.rejects(
      () =>
        harness.service
          .markCancelled(
            "workspace-a",
            "cm-test-transaction",
          ),
      /SIMULATED_BACKUP_UPDATE_FAILURE/,
    );


    assert.match(
      harness.state()
        .primaryDescription,
      /^\[CANCELLED\]/,
    );

    assert.equal(
      harness.state()
        .backupDescription,
      "coffee",
    );


    harness.allowBackupUpdate();


    const repaired =
      await harness.service
        .markCancelled(
          "workspace-a",
          "cm-test-transaction",
        );


    assert.equal(
      repaired,
      true,
    );

    assert.match(
      harness.state()
        .primaryDescription,
      /^\[CANCELLED\]/,
    );

    assert.match(
      harness.state()
        .backupDescription,
      /^\[CANCELLED\]/,
    );

  },
);


test(
  "treats already cancelled matching row as matched",
  async () => {

    const harness =
      createHarness({
        primaryDescription:
          "[CANCELLED] coffee",

        includeBackup:
          false,
      });


    const matched =
      await harness.service
        .markCancelled(
          "workspace-a",
          "cm-test-transaction",
        );


    assert.equal(
      matched,
      true,
    );

    assert.equal(
      harness.state()
        .updateCount,
      0,
    );

  },
);


test(
  "returns false when transaction id is absent",
  async () => {

    const harness =
      createHarness({
        includeBackup:
          true,
      });


    const service =
      harness.service as any;


    service.sheetsService.readRange =
      async () => [
        [
          "id",
          "date",
          "time",
          "type",
          "category",
          "merchant",
          "description",
        ],
        [
          "cm-other-transaction",
          "",
          "",
          "EXPENSE",
          "",
          "",
          "coffee",
        ],
      ];


    const matched =
      await harness.service
        .markCancelled(
          "workspace-a",
          "cm-test-transaction",
        );


    assert.equal(
      matched,
      false,
    );

    assert.equal(
      harness.state()
        .updateCount,
      0,
    );

  },
);
