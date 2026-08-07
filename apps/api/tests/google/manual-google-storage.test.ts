import assert from "node:assert/strict";
import test from "node:test";

import {
  GoogleSettingsService,
} from "../../src/modules/google/settings/google-settings.service.js";

const WORKSPACE_ID =
  "workspace-a";

const FOLDER_ID =
  "folder-root-123";

const PRIMARY_ID =
  "sheet-primary-123";

const BACKUP_ID =
  "sheet-backup-456";

const FOLDER_URL =
  `https://drive.google.com/drive/folders/${FOLDER_ID}?usp=sharing`;

const PRIMARY_URL =
  `https://docs.google.com/spreadsheets/d/${PRIMARY_ID}/edit#gid=0`;

const BACKUP_URL =
  `https://docs.google.com/spreadsheets/d/${BACKUP_ID}/edit#gid=0`;

const TRANSACTION_HEADER = [
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

type SheetKind =
  | "COMPATIBLE"
  | "EMPTY"
  | "INCOMPATIBLE";

function compatibleSettings(){
  return [
    [
      "Workspace ID",
      WORKSPACE_ID,
    ],
    [
      "Spreadsheet ID",
      "legacy-or-template-id",
    ],
    [
      "Workspace Type",
      "PERSONAL",
    ],
    [
      "Created",
      "2026-08-07T00:00:00.000Z",
    ],
    [
      "System",
      "MyPocket AI",
    ],
  ];
}

function createHarness(
  input:{
    folderMimeType?:string;
    folderCanAddChildren?:boolean;
    primaryKind?:SheetKind;
    backupKind?:SheetKind;
  } = {},
){

  const calls = {
    metadata:[] as string[],
    upserts:[] as any[],
    sheetCreates:[] as Array<{
      spreadsheetId:string;
      titles:string[];
    }>,
    initializes:[] as any[],
  };

  const installed =
    new Set<string>();

  const kindById =
    new Map<string, SheetKind>([
      [
        PRIMARY_ID,
        input.primaryKind
        ?? "COMPATIBLE",
      ],
      [
        BACKUP_ID,
        input.backupKind
        ?? "COMPATIBLE",
      ],
    ]);

  const effectiveKind = (
    spreadsheetId:string,
  ):SheetKind => {

    if(
      installed.has(
        spreadsheetId,
      )
    ){
      return "COMPATIBLE";
    }

    return kindById.get(
      spreadsheetId,
    )
    ?? "INCOMPATIBLE";
  };

  const service =
    Object.create(
      GoogleSettingsService.prototype,
    ) as any;

  service.repository = {
    upsert:
      async (
        value:any,
      ) => {

        calls.upserts.push(
          value,
        );

        return value;
      },
  };

  service.workspaceRepository = {
    findWorkspaceById:
      async (
        workspaceId:string,
      ) => {

        assert.equal(
          workspaceId,
          WORKSPACE_ID,
        );

        return {
          id:
            workspaceId,
          type:
            "PERSONAL",
        };
      },
  };

  service.driveService = {
    getFileMetadata:
      async (
        workspaceId:string,
        fileId:string,
      ) => {

        assert.equal(
          workspaceId,
          WORKSPACE_ID,
        );

        calls.metadata.push(
          `drive:${fileId}`,
        );

        if(
          fileId === FOLDER_ID
        ){

          return {
            id:
              FOLDER_ID,

            name:
              "My Finance Folder",

            mimeType:
              input.folderMimeType
              ??
              "application/vnd.google-apps.folder",

            trashed:
              false,

            capabilities:{
              canAddChildren:
                input.folderCanAddChildren
                ??
                true,

              canEdit:
                true,
            },
          };
        }

        if(
          fileId === PRIMARY_ID
          ||
          fileId === BACKUP_ID
        ){

          return {
            id:
              fileId,

            name:
              fileId === PRIMARY_ID
                ?
                "Primary Finance"
                :
                "Backup Finance",

            mimeType:
              "application/vnd.google-apps.spreadsheet",

            trashed:
              false,

            capabilities:{
              canAddChildren:
                false,

              canEdit:
                true,
            },
          };
        }

        throw new Error(
          "unexpected drive file id",
        );
      },
  };

  service.sheetsService = {
    getSpreadsheetMetadata:
      async (
        workspaceId:string,
        spreadsheetId:string,
      ) => {

        assert.equal(
          workspaceId,
          WORKSPACE_ID,
        );

        calls.metadata.push(
          `sheet:${spreadsheetId}`,
        );

        const kind =
          effectiveKind(
            spreadsheetId,
          );

        return {
          spreadsheetId,
          title:
            spreadsheetId
            === PRIMARY_ID
              ? "Primary Finance"
              : "Backup Finance",
          sheetTitles:
            kind
            === "COMPATIBLE"
              ? [
                  "Transactions",
                  "Dashboard",
                  "Settings",
                ]
              : [
                  "Sheet1",
                ],
        };
      },

    hasAnyValues:
      async (
        workspaceId:string,
        spreadsheetId:string,
      ) => {

        assert.equal(
          workspaceId,
          WORKSPACE_ID,
        );

        return effectiveKind(
          spreadsheetId,
        )
        !== "EMPTY";
      },

    readRange:
      async (
        workspaceId:string,
        request:{
          spreadsheetId:string;
          range:string;
        },
      ) => {

        assert.equal(
          workspaceId,
          WORKSPACE_ID,
        );

        const kind =
          effectiveKind(
            request.spreadsheetId,
          );

        if(
          kind !== "COMPATIBLE"
        ){
          return [];
        }

        if(
          request.range
          ===
          "Transactions!A1:O1"
        ){
          return [
            TRANSACTION_HEADER,
          ];
        }

        if(
          request.range
          ===
          "Settings!A1:B12"
        ){
          return compatibleSettings();
        }

        return [];
      },

    createMissingSheets:
      async (
        workspaceId:string,
        request:{
          spreadsheetId:string;
          titles:string[];
        },
      ) => {

        assert.equal(
          workspaceId,
          WORKSPACE_ID,
        );

        calls.sheetCreates.push({
          spreadsheetId:
            request.spreadsheetId,
          titles:
            request.titles,
        });
      },
  };

  service.sheetInitializer = {
    initialize:
      async (
        value:{
          workspaceId:string;
          spreadsheetId:string;
          workspaceType:string;
        },
      ) => {

        calls.initializes.push(
          value,
        );

        installed.add(
          value.spreadsheetId,
        );
      },
  };

  return {
    service,
    calls,
  };
}

function isCode(
  code:string,
){
  return (
    error:unknown,
  ) => (
    (
      error as {
        code?:string;
      }
    )
      ?.code
    ===
    code
  );
}

test(
  "validates a compatible manual folder and working spreadsheet without mutating settings",
  async () => {

    const {
      service,
      calls,
    } =
      createHarness();

    const result =
      await service
        .validateManualStorage(
          WORKSPACE_ID,
          {
            rootFolderUrl:
              FOLDER_URL,
            spreadsheetUrl:
              PRIMARY_URL,
          },
        );

    assert.equal(
      result.folder.id,
      FOLDER_ID,
    );

    assert.equal(
      result.working.id,
      PRIMARY_ID,
    );

    assert.equal(
      result.working.classification,
      "COMPATIBLE",
    );

    assert.equal(
      result.canSave,
      true,
    );

    assert.equal(
      result.installRequired,
      false,
    );

    assert.equal(
      calls.upserts.length,
      0,
    );

    assert.equal(
      calls.sheetCreates.length,
      0,
    );

    assert.equal(
      calls.initializes.length,
      0,
    );
  },
);

test(
  "validates an optional compatible backup spreadsheet",
  async () => {

    const {
      service,
    } =
      createHarness();

    const result =
      await service
        .validateManualStorage(
          WORKSPACE_ID,
          {
            rootFolderUrl:
              FOLDER_URL,
            spreadsheetUrl:
              PRIMARY_URL,
            backupSpreadsheetUrl:
              BACKUP_URL,
          },
        );

    assert.equal(
      result.canSave,
      true,
    );

    assert.equal(
      result.backup?.id,
      BACKUP_ID,
    );

    assert.equal(
      result.backup?.classification,
      "COMPATIBLE",
    );
  },
);

test(
  "rejects using the same spreadsheet as primary and backup before mutation",
  async () => {

    const {
      service,
      calls,
    } =
      createHarness();

    await assert.rejects(
      async () =>
        service
          .validateManualStorage(
            WORKSPACE_ID,
            {
              rootFolderUrl:
                FOLDER_URL,
              spreadsheetUrl:
                PRIMARY_URL,
              backupSpreadsheetUrl:
                PRIMARY_URL,
            },
          ),
      isCode(
        "GOOGLE_MANUAL_STORAGE_DUPLICATE_SHEET",
      ),
    );

    assert.equal(
      calls.upserts.length,
      0,
    );
  },
);

test(
  "classifies a demonstrably empty spreadsheet as EMPTY and does not save",
  async () => {

    const {
      service,
      calls,
    } =
      createHarness({
        primaryKind:
          "EMPTY",
      });

    const result =
      await service
        .validateManualStorage(
          WORKSPACE_ID,
          {
            rootFolderUrl:
              FOLDER_URL,
            spreadsheetUrl:
              PRIMARY_URL,
          },
        );

    assert.equal(
      result.working.classification,
      "EMPTY",
    );

    assert.equal(
      result.canSave,
      false,
    );

    assert.equal(
      result.installRequired,
      true,
    );

    assert.equal(
      calls.upserts.length,
      0,
    );

    assert.equal(
      calls.sheetCreates.length,
      0,
    );
  },
);

test(
  "classifies non-empty non-MyPocket data as INCOMPATIBLE and fails closed",
  async () => {

    const {
      service,
      calls,
    } =
      createHarness({
        primaryKind:
          "INCOMPATIBLE",
      });

    const result =
      await service
        .validateManualStorage(
          WORKSPACE_ID,
          {
            rootFolderUrl:
              FOLDER_URL,
            spreadsheetUrl:
              PRIMARY_URL,
          },
        );

    assert.equal(
      result.working.classification,
      "INCOMPATIBLE",
    );

    assert.equal(
      result.canSave,
      false,
    );

    assert.equal(
      result.installRequired,
      false,
    );

    assert.equal(
      calls.upserts.length,
      0,
    );

    assert.equal(
      calls.sheetCreates.length,
      0,
    );

    assert.equal(
      calls.initializes.length,
      0,
    );
  },
);

test(
  "rejects a manual Drive resource that is not a writable folder",
  async () => {

    const {
      service,
      calls,
    } =
      createHarness({
        folderMimeType:
          "application/pdf",
      });

    await assert.rejects(
      async () =>
        service
          .validateManualStorage(
            WORKSPACE_ID,
            {
              rootFolderUrl:
                FOLDER_URL,
              spreadsheetUrl:
                PRIMARY_URL,
            },
          ),
      isCode(
        "GOOGLE_MANUAL_STORAGE_FOLDER_INVALID",
      ),
    );

    assert.equal(
      calls.upserts.length,
      0,
    );
  },
);

test(
  "rejects malformed Google spreadsheet URLs before settings mutation",
  async () => {

    const {
      service,
      calls,
    } =
      createHarness();

    await assert.rejects(
      async () =>
        service
          .validateManualStorage(
            WORKSPACE_ID,
            {
              rootFolderUrl:
                FOLDER_URL,
              spreadsheetUrl:
                "https://example.com/not-google-sheet",
            },
          ),
      isCode(
        "GOOGLE_MANUAL_STORAGE_SPREADSHEET_URL_INVALID",
      ),
    );

    assert.equal(
      calls.upserts.length,
      0,
    );
  },
);

test(
  "save persists only after compatible validation and maps the manual folder to all storage destinations",
  async () => {

    const {
      service,
      calls,
    } =
      createHarness();

    const result =
      await service
        .saveManualStorage(
          WORKSPACE_ID,
          {
            rootFolderUrl:
              FOLDER_URL,
            spreadsheetUrl:
              PRIMARY_URL,
          },
        );

    assert.equal(
      calls.upserts.length,
      1,
    );

    const saved =
      calls.upserts[0];

    assert.equal(
      saved.spreadsheetId,
      PRIMARY_ID,
    );

    assert.equal(
      saved.backupSpreadsheetId,
      null,
    );

    assert.equal(
      saved.backupSpreadsheetTitle,
      null,
    );

    assert.equal(
      saved.rootFolderId,
      FOLDER_ID,
    );

    assert.equal(
      saved.reportsFolderId,
      FOLDER_ID,
    );

    assert.equal(
      saved.receiptsFolderId,
      FOLDER_ID,
    );

    assert.equal(
      saved.exportsFolderId,
      FOLDER_ID,
    );

    assert.equal(
      saved.mode,
      "EXISTING_SHEET",
    );

    assert.equal(
      result.spreadsheetId,
      PRIMARY_ID,
    );

    assert.equal(
      calls.sheetCreates.length,
      0,
    );

    assert.equal(
      calls.initializes.length,
      0,
    );
  },
);

test(
  "save refuses incompatible sheets and never changes workspace settings",
  async () => {

    const {
      service,
      calls,
    } =
      createHarness({
        primaryKind:
          "INCOMPATIBLE",
      });

    await assert.rejects(
      async () =>
        service
          .saveManualStorage(
            WORKSPACE_ID,
            {
              rootFolderUrl:
                FOLDER_URL,
              spreadsheetUrl:
                PRIMARY_URL,
            },
          ),
      isCode(
        "GOOGLE_MANUAL_STORAGE_NOT_READY",
      ),
    );

    assert.equal(
      calls.upserts.length,
      0,
    );

    assert.equal(
      calls.sheetCreates.length,
      0,
    );

    assert.equal(
      calls.initializes.length,
      0,
    );
  },
);

test(
  "explicit template install is allowed only for an EMPTY spreadsheet and does not switch settings",
  async () => {

    const {
      service,
      calls,
    } =
      createHarness({
        primaryKind:
          "EMPTY",
      });

    const result =
      await service
        .installManualTemplate(
          WORKSPACE_ID,
          {
            spreadsheetUrl:
              PRIMARY_URL,
          },
        );

    assert.equal(
      calls.sheetCreates.length,
      1,
    );

    assert.deepEqual(
      calls.sheetCreates[0],
      {
        spreadsheetId:
          PRIMARY_ID,
        titles:[
          "Transactions",
          "Dashboard",
          "Settings",
        ],
      },
    );

    assert.equal(
      calls.initializes.length,
      1,
    );

    assert.equal(
      result.classification,
      "COMPATIBLE",
    );

    assert.equal(
      calls.upserts.length,
      0,
    );
  },
);

test(
  "explicit template install refuses non-empty incompatible spreadsheets without writing anything",
  async () => {

    const {
      service,
      calls,
    } =
      createHarness({
        primaryKind:
          "INCOMPATIBLE",
      });

    await assert.rejects(
      async () =>
        service
          .installManualTemplate(
            WORKSPACE_ID,
            {
              spreadsheetUrl:
                PRIMARY_URL,
            },
          ),
      isCode(
        "GOOGLE_MANUAL_STORAGE_INSTALL_NOT_ALLOWED",
      ),
    );

    assert.equal(
      calls.sheetCreates.length,
      0,
    );

    assert.equal(
      calls.initializes.length,
      0,
    );

    assert.equal(
      calls.upserts.length,
      0,
    );
  },
);

test(
  "folder write capability is required before manual storage can be saved",
  async () => {

    const {
      service,
      calls,
    } =
      createHarness({
        folderCanAddChildren:
          false,
      });

    await assert.rejects(
      async () =>
        service
          .saveManualStorage(
            WORKSPACE_ID,
            {
              rootFolderUrl:
                FOLDER_URL,
              spreadsheetUrl:
                PRIMARY_URL,
            },
          ),
      isCode(
        "GOOGLE_MANUAL_STORAGE_FOLDER_NOT_WRITABLE",
      ),
    );

    assert.equal(
      calls.upserts.length,
      0,
    );
  },
);
