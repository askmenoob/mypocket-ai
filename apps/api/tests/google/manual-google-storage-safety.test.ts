import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import test from "node:test";

import {
  SheetInitializerService,
} from "../../src/modules/google/initializer/sheet-initializer.service.js";

import {
  GoogleSettingsService,
} from "../../src/modules/google/settings/google-settings.service.js";


const WORKSPACE_ID =
  "workspace-1";

const FOLDER_ID =
  "manual-folder-safety-123";

const WORKING_ID =
  "working-sheet-safety-123";

const BACKUP_ID =
  "backup-sheet-safety-123";

const FOLDER_URL =
  `https://drive.google.com/drive/folders/${FOLDER_ID}`;

const WORKING_URL =
  `https://docs.google.com/spreadsheets/d/${WORKING_ID}/edit`;

const BACKUP_URL =
  `https://docs.google.com/spreadsheets/d/${BACKUP_ID}/edit`;

const SPREADSHEET_MIME =
  "application/vnd.google-apps.spreadsheet";

const FOLDER_MIME =
  "application/vnd.google-apps.folder";

const transactionHeader = [
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
];


function compatibleSettings(
  workspaceId =
    WORKSPACE_ID,
){
  return [
    [
      "Workspace ID",
      workspaceId,
    ],
    [
      "Spreadsheet ID",
      "template-or-legacy-id",
    ],
    [
      "Workspace Type",
      "PERSONAL",
    ],
    [
      "Created",
      "2026-08-08T00:00:00.000Z",
    ],
    [
      "System",
      "MyPocket AI",
    ],
    [
      "Version",
      "1.0.0",
    ],
    [
      "Status",
      "ACTIVE",
    ],
  ];
}


function isCode(
  code:string,
){
  return (
    error:unknown,
  ) => (
    Boolean(
      error
      &&
      typeof error
      ===
      "object"
      &&
      (
        error as {
          code?:string;
        }
      ).code
      ===
      code
    )
  );
}


type HarnessInput = {
  workingCanEdit?:boolean;
  backupCanEdit?:boolean;
  workingWorkspaceId?:string;
  backupWorkspaceId?:string;
  existingIds?:Record<string, string[]>;
  transactions?:any[];
  currentSpreadsheetId?:string | null;
  currentBackupSpreadsheetId?:string | null;
  currentRows?:Record<string, unknown[][]>;
};


function createHarness(
  input:HarnessInput = {},
){

  const calls = {
    upserts:[] as any[],
    appends:[] as any[],
    reads:[] as Array<{
      spreadsheetId:string;
      range:string;
    }>,
    sequence:[] as string[],
  };

  const service =
    Object.create(
      GoogleSettingsService.prototype,
    ) as any;

  service.repository = {

    findByWorkspaceId:
      async () => {

        if(
          input.currentSpreadsheetId
          === undefined
          &&
          input.currentBackupSpreadsheetId
          === undefined
        ){
          return null;
        }

        return {
          workspaceId:
            WORKSPACE_ID,

          spreadsheetId:
            input.currentSpreadsheetId
            ??
            null,

          backupSpreadsheetId:
            input.currentBackupSpreadsheetId
            ??
            null,
        };
      },

    upsert:
      async (
        data:any,
      ) => {

        calls.sequence.push(
          "upsert",
        );

        calls.upserts.push(
          data,
        );

        return {
          id:
            "setting-1",
          ...data,
        };
      },
  };

  service.workspaceRepository = {

    findWorkspaceById:
      async (
        workspaceId:string,
      ) => ({
        id:
          workspaceId,

        type:
          "PERSONAL",
      }),
  };

  service.driveService = {

    getFileMetadata:
      async (
        _workspaceId:string,
        fileId:string,
      ) => {

        if(fileId === FOLDER_ID){

          return {
            id:
              fileId,

            name:
              "MyPocket Folder",

            mimeType:
              FOLDER_MIME,

            trashed:
              false,

            capabilities:{
              canAddChildren:
                true,

              canEdit:
                true,
            },
          };
        }

        const canEdit =
          fileId === BACKUP_ID
            ?
            input.backupCanEdit
            ??
            true
            :
            input.workingCanEdit
            ??
            true;

        return {
          id:
            fileId,

          name:
            fileId === BACKUP_ID
              ?
              "Backup Sheet"
              :
              "Working Sheet",

          mimeType:
            SPREADSHEET_MIME,

          trashed:
            false,

          capabilities:{
            canAddChildren:
              false,

            canEdit,
          },
        };
      },
  };

  service.sheetsService = {

    getSpreadsheetMetadata:
      async (
        _workspaceId:string,
        spreadsheetId:string,
      ) => ({
        spreadsheetId,

        title:
          spreadsheetId === BACKUP_ID
            ?
            "Backup Sheet"
            :
            "Working Sheet",

        sheetTitles:[
          "Transactions",
          "Dashboard",
          "Settings",
        ],
      }),

    hasAnyValues:
      async () =>
        true,

    readRange:
      async (
        _workspaceId:string,
        readInput:{
          spreadsheetId:string;
          range:string;
        },
      ) => {

        calls.reads.push({
          spreadsheetId:
            readInput.spreadsheetId,

          range:
            readInput.range,
        });

        if(
          readInput.range
          ===
          "Transactions!A1:O1"
        ){
          return [
            transactionHeader,
          ];
        }

        if(
          readInput.range
          ===
          "Settings!A1:B12"
        ){

          const boundWorkspaceId =
            readInput.spreadsheetId
            ===
            BACKUP_ID
              ?
              input.backupWorkspaceId
              ??
              WORKSPACE_ID
              :
              input.workingWorkspaceId
              ??
              WORKSPACE_ID;

          return compatibleSettings(
            boundWorkspaceId,
          );
        }

        if(
          readInput.range
          ===
          "Transactions!A:O"
        ){

          return (
            input.currentRows
              ?.[readInput.spreadsheetId]
            ??
            []
          );
        }

        if(
          readInput.range
          ===
          "Transactions!A:A"
        ){

          const existing =
            input.existingIds
              ?.[readInput.spreadsheetId]
            ??
            [];

          return [
            [
              "Transaction ID",
            ],
            ...existing.map(
              (id) => [
                id,
              ],
            ),
          ];
        }

        return [];
      },

    appendRow:
      async (
        _workspaceId:string,
        appendInput:any,
      ) => {

        calls.sequence.push(
          "append",
        );

        calls.appends.push(
          appendInput,
        );
      },

    createMissingSheets:
      async () =>
        undefined,
  };

  service.sheetInitializer = {
    initialize:
      async () =>
        undefined,
  };

  service.app = {
    prisma:{
      transaction:{
        findMany:
          async () =>
            input.transactions
            ??
            [],
      },
    },
  };

  return {
    service,
    calls,
  };
}


function transaction(
  id:string,
){
  return {
    id,

    transactionDate:
      new Date(
        "2026-08-08T00:00:00.000Z",
      ),

    type:
      "EXPENSE",

    category:{
      name:
        "Shopping",
    },

    merchant:{
      name:
        "Safety Merchant",
    },

    description:
      "Safety transaction",

    amount:{
      toString:
        () =>
          "12.34",
    },

    paymentMethod:{
      name:
        "Cash",
    },

    receiptUrl:
      null,
  };
}


test(
  "rejects a read-only working Google Sheet",
  async () => {

    const {
      service,
      calls,
    } =
      createHarness({
        workingCanEdit:
          false,
      });

    await assert.rejects(
      () =>
        service.validateManualStorage(
          WORKSPACE_ID,
          {
            rootFolderUrl:
              FOLDER_URL,

            spreadsheetUrl:
              WORKING_URL,
          },
        ),
      isCode(
        "GOOGLE_MANUAL_STORAGE_SPREADSHEET_NOT_WRITABLE",
      ),
    );

    assert.equal(
      calls.upserts.length,
      0,
    );
  },
);


test(
  "rejects a read-only backup Google Sheet",
  async () => {

    const {
      service,
    } =
      createHarness({
        backupCanEdit:
          false,
      });

    await assert.rejects(
      () =>
        service.validateManualStorage(
          WORKSPACE_ID,
          {
            rootFolderUrl:
              FOLDER_URL,

            spreadsheetUrl:
              WORKING_URL,

            backupSpreadsheetUrl:
              BACKUP_URL,
          },
        ),
      isCode(
        "GOOGLE_MANUAL_STORAGE_SPREADSHEET_NOT_WRITABLE",
      ),
    );
  },
);


test(
  "rejects a compatible-looking sheet bound to another workspace",
  async () => {

    const {
      service,
    } =
      createHarness({
        workingWorkspaceId:
          "workspace-other",
      });

    const result =
      await service
        .validateManualStorage(
          WORKSPACE_ID,
          {
            rootFolderUrl:
              FOLDER_URL,

            spreadsheetUrl:
              WORKING_URL,
          },
        );

    assert.equal(
      result.working
        .classification,
      "INCOMPATIBLE",
    );

    assert.equal(
      result.canSave,
      false,
    );
  },
);


test(
  "empty-sheet installer writes Version and Status metadata",
  async () => {

    const updates:any[] = [];

    const initializer =
      Object.create(
        SheetInitializerService.prototype,
      ) as any;

    initializer.sheets = {
      updateRange:
        async (
          _workspaceId:string,
          updateInput:any,
        ) => {

          updates.push(
            updateInput,
          );
        },
    };

    await initializer
      .initialize({
        workspaceId:
          WORKSPACE_ID,

        spreadsheetId:
          WORKING_ID,

        workspaceType:
          "PERSONAL",
      });

    const settingsUpdate =
      updates.find(
        (entry) =>
          String(
            entry.range,
          )
          .startsWith(
            "Settings!",
          ),
      );

    assert.ok(
      settingsUpdate,
    );

    assert.equal(
      settingsUpdate.range,
      "Settings!A1:B7",
    );

    assert.ok(
      settingsUpdate.values
        .some(
          (row:any[]) =>
            row[0]
            ===
            "Version"
            &&
            row[1]
            ===
            "1.0.0",
        ),
    );

    assert.ok(
      settingsUpdate.values
        .some(
          (row:any[]) =>
            row[0]
            ===
            "Status"
            &&
            row[1]
            ===
            "ACTIVE",
        ),
    );
  },
);


test(
  "manual save reconciles missing DB transactions before settings switch",
  async () => {

    const {
      service,
      calls,
    } =
      createHarness({
        transactions:[
          transaction(
            "tx-missing-1",
          ),
        ],

        existingIds:{
          [WORKING_ID]:
            [],
        },
      });

    await service
      .saveManualStorage(
        WORKSPACE_ID,
        {
          rootFolderUrl:
            FOLDER_URL,

          spreadsheetUrl:
            WORKING_URL,
        },
      );

    assert.equal(
      calls.appends.length,
      1,
    );

    assert.equal(
      calls.appends[0]
        .spreadsheetId,
      WORKING_ID,
    );

    assert.equal(
      calls.appends[0]
        .values[0],
      "tx-missing-1",
    );

    const appendIndex =
      calls.sequence
        .indexOf(
          "append",
        );

    const upsertIndex =
      calls.sequence
        .indexOf(
          "upsert",
        );

    assert.ok(
      appendIndex
      >=
      0,
    );

    assert.ok(
      upsertIndex
      >=
      0,
    );

    assert.ok(
      appendIndex
      <
      upsertIndex,
    );
  },
);


test(
  "manual save reconciliation is idempotent for existing transaction ids",
  async () => {

    const {
      service,
      calls,
    } =
      createHarness({
        transactions:[
          transaction(
            "tx-existing-1",
          ),
        ],

        existingIds:{
          [WORKING_ID]:[
            "tx-existing-1",
          ],
        },
      });

    await service
      .saveManualStorage(
        WORKSPACE_ID,
        {
          rootFolderUrl:
            FOLDER_URL,

          spreadsheetUrl:
            WORKING_URL,
        },
      );

    assert.ok(
      calls.reads
        .some(
          (entry) =>
            entry.spreadsheetId
            ===
            WORKING_ID
            &&
            entry.range
            ===
            "Transactions!A:A",
        ),
    );

    assert.equal(
      calls.appends.length,
      0,
    );

    assert.equal(
      calls.upserts.length,
      1,
    );
  },
);


test(
  "manual Google storage controls are gated to Owner and Admin",
  () => {

    const premium =
      readFileSync(
        resolve(
          process.cwd(),
          "../web/src/premium-dashboard.tsx",
        ),
        "utf8",
      );

    const bootstrap =
      readFileSync(
        resolve(
          process.cwd(),
          "../web/src/app-bootstrap.tsx",
        ),
        "utf8",
      );

    assert.match(
      premium,
      /canManageGoogleStorage:boolean/,
    );

    assert.match(
      premium,
      /props\.canManageGoogleStorage\s*&&/,
    );

    assert.match(
      bootstrap,
      /canManageGoogleStorage=\{[\s\S]{0,180}actorRole\s*===\s*"OWNER"[\s\S]{0,180}actorRole\s*===\s*"ADMIN"/,
    );
  },
);


test(
  "does not resurrect transactions marked deleted or cancelled in the current configured sheet",
  async () => {

    const currentSpreadsheetId =
      "current-sheet-before-switch";

    const {
      service,
      calls,
    } =
      createHarness({

        currentSpreadsheetId,

        currentRows:{
          [currentSpreadsheetId]:[
            transactionHeader,
            [
              "tx-deleted-before-switch",
              "",
              "",
              "",
              "",
              "",
              "[DELETED] removed by owner",
            ],
            [
              "tx-cancelled-before-switch",
              "",
              "",
              "",
              "",
              "",
              "[CANCELLED] cancelled earlier",
            ],
          ],
        },

        transactions:[
          transaction(
            "tx-deleted-before-switch",
          ),
          transaction(
            "tx-cancelled-before-switch",
          ),
        ],

        existingIds:{
          [WORKING_ID]:
            [],
        },
      });

    await service
      .saveManualStorage(
        WORKSPACE_ID,
        {
          rootFolderUrl:
            FOLDER_URL,

          spreadsheetUrl:
            WORKING_URL,
        },
      );

    assert.ok(
      calls.reads
        .some(
          (entry) =>
            entry.spreadsheetId
            ===
            currentSpreadsheetId
            &&
            entry.range
            ===
            "Transactions!A:O",
        ),
    );

    assert.equal(
      calls.appends.length,
      0,
    );

    assert.equal(
      calls.upserts.length,
      1,
    );
  },
);


test(
  "recreate Google Sheet dashboard control is gated to Owner and Admin",
  async () => {

    const {
      readFileSync,
    } =
      await import(
        "node:fs"
      );

    const {
      dirname,
      resolve,
    } =
      await import(
        "node:path"
      );

    const {
      fileURLToPath,
    } =
      await import(
        "node:url"
      );

    const currentDirectory =
      dirname(
        fileURLToPath(
          import.meta.url,
        ),
      );

    const premiumSource =
      readFileSync(
        resolve(
          currentDirectory,
          "../../../web/src/premium-dashboard.tsx",
        ),
        "utf8",
      );

    const recreateIndex =
      premiumSource
        .indexOf(
          "onClick={props.onRecreateGoogle}",
        );

    assert.notEqual(
      recreateIndex,
      -1,
    );

    const guardContext =
      premiumSource
        .slice(
          Math.max(
            0,
            recreateIndex - 900,
          ),
          recreateIndex,
        );

    assert.match(
      guardContext,
      /props\.canManageGoogleStorage\s*&&/,
    );
  },
);


test(
  "manual Google storage controls render on the dedicated Google Sheet page",
  async () => {

    const {
      readFileSync,
    } =
      await import(
        "node:fs"
      );

    const {
      dirname,
      resolve,
    } =
      await import(
        "node:path"
      );

    const {
      fileURLToPath,
    } =
      await import(
        "node:url"
      );

    const currentDirectory =
      dirname(
        fileURLToPath(
          import.meta.url,
        ),
      );

    const source =
      readFileSync(
        resolve(
          currentDirectory,
          "../../../web/src/app-bootstrap.tsx",
        ),
        "utf8",
      );

    const panelIndex =
      source
        .indexOf(
          "Panel title={dashboardText.navGoogleSheet}",
        );

    assert.notEqual(
      panelIndex,
      -1,
    );

    const panelEnd =
      source
        .indexOf(
          "</Panel>",
          panelIndex,
        );

    assert.notEqual(
      panelEnd,
      -1,
    );

    const googlePanel =
      source
        .slice(
          panelIndex,
          panelEnd,
        );

    assert.match(
      googlePanel,
      /Google Drive Folder URL/,
    );

    assert.match(
      googlePanel,
      /Working Google Sheet URL/,
    );

    assert.match(
      googlePanel,
      /Backup Google Sheet URL/,
    );

    assert.match(
      googlePanel,
      /Validate Google Links/,
    );

    assert.match(
      googlePanel,
      /Save Google Links/,
    );

    assert.match(
      googlePanel,
      /legacyValidateManualGoogleStorage/,
    );

    assert.match(
      googlePanel,
      /legacySaveManualGoogleStorage/,
    );

    assert.match(
      source,
      /\/google\/settings\/manual\/validate/,
    );

    assert.match(
      source,
      /\/google\/settings\/manual\/save/,
    );

    assert.match(
      source,
      /\/google\/settings\/manual\/install-template/,
    );
  },
);
