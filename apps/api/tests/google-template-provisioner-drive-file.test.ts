import assert from "node:assert/strict";
import test from "node:test";

import {
  TemplateProvisioner,
} from "../src/modules/google/provisioner/template.provisioner.js";


test(
  "provisions from a public template import and backs up the app-created sheet",
  async () => {
    const provisioner =
      new TemplateProvisioner(
        {} as any,
      ) as any;

    const imports:Array<any> = [];
    const copies:Array<any> = [];

    provisioner.templateService = {
      getTemplate:async () => ({
        type:"PERSONAL",
        name:"MyPocket Personal Finance",
        spreadsheetId:"public-template",
        version:"1.0",
        active:true,
      }),
    };
    provisioner.driveService = {
      createWorkspaceFolderStructure:
        async () => ({
          rootFolderId:"root",
          reportsFolderId:"reports",
          receiptsFolderId:"receipts",
          exportsFolderId:"exports",
        }),
      importPublicSpreadsheetTemplate:
        async (
          ...input:Array<any>
        ) => {
          imports.push(
            input,
          );

          return {
            id:"user-owned-sheet",
            name:"MyPocket Personal Finance",
            url:"https://docs.google.com/spreadsheets/d/user-owned-sheet/edit",
          };
        },
      copyFile:
        async (
          ...input:Array<any>
        ) => {
          copies.push(
            input,
          );

          return {
            id:"backup-sheet",
            name:"MyPocket Personal Finance Backup - DO NOT DELETE",
            url:"https://docs.google.com/spreadsheets/d/backup-sheet/edit",
          };
        },
    };

    const result =
      await provisioner
        .provision({
          workspaceId:"workspace-1",
          workspaceType:"PERSONAL",
          rootFolderName:
            "MyPocket AI Personal Pro (nikaazfar@gmail.com)",
        });

    assert.deepEqual(
      imports,
      [[
        "workspace-1",
        "public-template",
        "MyPocket Personal Finance",
        "reports",
      ]],
    );
    assert.equal(
      copies.length,
      1,
    );
    assert.equal(
      copies[0][1],
      "user-owned-sheet",
    );
    assert.equal(
      result.spreadsheetId,
      "user-owned-sheet",
    );
    assert.equal(
      result.backupSpreadsheetId,
      "backup-sheet",
    );
  },
);
