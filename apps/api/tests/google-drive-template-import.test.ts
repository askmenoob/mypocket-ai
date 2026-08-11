import assert from "node:assert/strict";
import test from "node:test";

import {
  GoogleDriveService,
} from "../src/modules/google/drive/google-drive.service.js";


const XLSX_BYTES =
  new Uint8Array([
    0x50,
    0x4b,
    0x03,
    0x04,
    0x01,
    0x02,
  ]);


test(
  "imports a public spreadsheet template as an app-created Google Sheet",
  async () => {
    const service =
      new GoogleDriveService(
        {} as any,
      ) as any;

    let requestedUrl = "";
    let captured:any = null;

    service.fetchTemplate =
      async (
        url:string,
      ) => {
        requestedUrl = url;

        return new Response(
          XLSX_BYTES,
          {
            status:200,
            headers:{
              "content-length":
                String(
                  XLSX_BYTES.byteLength,
                ),
              "content-type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
          },
        );
      };

    service.getClient =
      async () => ({
        files:{
          create:async (input:any) => {
            captured = input;

            return {
              data:{
                id:"created-sheet",
                name:input.requestBody.name,
                webViewLink:
                  "https://docs.google.com/spreadsheets/d/created-sheet/edit",
              },
            };
          },
        },
      });

    const result =
      await service
        .importPublicSpreadsheetTemplate(
          "workspace-1",
          "source_template-123",
          "MyPocket Personal Finance",
          "reports-folder",
        );

    assert.equal(
      requestedUrl,
      "https://docs.google.com/spreadsheets/d/source_template-123/export?format=xlsx",
    );
    assert.equal(
      captured.requestBody.mimeType,
      "application/vnd.google-apps.spreadsheet",
    );
    assert.deepEqual(
      captured.requestBody.parents,
      [
        "reports-folder",
      ],
    );
    assert.equal(
      captured.media.mimeType,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    const chunks:Array<Buffer> = [];

    for await(
      const chunk
      of captured.media.body
    ){

      chunks.push(
        Buffer.from(
          chunk,
        ),
      );

    }

    assert.deepEqual(
      Buffer.concat(
        chunks,
      ),
      Buffer.from(
        XLSX_BYTES,
      ),
    );
    assert.equal(
      result.id,
      "created-sheet",
    );
  },
);


test(
  "rejects unsafe template identifiers before making a network request",
  async () => {
    const service =
      new GoogleDriveService(
        {} as any,
      ) as any;

    let fetched = false;

    service.fetchTemplate =
      async () => {
        fetched = true;

        throw new Error(
          "unexpected fetch",
        );
      };

    await assert.rejects(
      service
        .importPublicSpreadsheetTemplate(
          "workspace-1",
          "../outside",
          "Unsafe",
          "reports-folder",
        ),
      /GOOGLE_TEMPLATE_FILE_ID_INVALID/,
    );
    assert.equal(
      fetched,
      false,
    );
  },
);


test(
  "rejects oversized public template exports before uploading",
  async () => {
    const service =
      new GoogleDriveService(
        {} as any,
      ) as any;

    let uploaded = false;

    service.fetchTemplate =
      async () =>
        new Response(
          XLSX_BYTES,
          {
            status:200,
            headers:{
              "content-length":
                String(
                  25
                  *
                  1024
                  *
                  1024,
                ),
            },
          },
        );

    service.getClient =
      async () => ({
        files:{
          create:async () => {
            uploaded = true;

            return {
              data:{},
            };
          },
        },
      });

    await assert.rejects(
      service
        .importPublicSpreadsheetTemplate(
          "workspace-1",
          "source_template-123",
          "Too large",
          "reports-folder",
        ),
      /GOOGLE_TEMPLATE_EXPORT_TOO_LARGE/,
    );
    assert.equal(
      uploaded,
      false,
    );
  },
);
