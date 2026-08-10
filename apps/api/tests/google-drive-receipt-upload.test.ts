import assert from "node:assert/strict";
import test from "node:test";

import {
  GoogleDriveService,
} from "../src/modules/google/drive/google-drive.service.js";


test(
  "uploads receipt bytes only into the validated workspace receipts folder",
  async () => {
    const service =
      new GoogleDriveService(
        {} as any,
      ) as any;

    let captured:any = null;
    service.getFileMetadata =
      async () => ({
        id:"receipts-folder",
        name:"Receipts",
        mimeType:"application/vnd.google-apps.folder",
        trashed:false,
        parents:["root"],
        capabilities:{
          canAddChildren:true,
          canEdit:true,
        },
      });
    service.getClient =
      async () => ({
        files:{
          create:async (input:any) => {
            captured = input;
            return {
              data:{
                id:"file-1",
                name:input.requestBody.name,
                mimeType:input.requestBody.mimeType,
                webViewLink:"https://drive.google.com/file/d/file-1/view",
              },
            };
          },
        },
      });

    const result =
      await service.uploadReceiptFile(
        "workspace-1",
        {
          receiptsFolderId:"receipts-folder",
          fileName:"receipt/2026\\08.jpg",
          mimeType:"image/jpeg",
          bytes:new Uint8Array([1, 2, 3]),
        },
      );

    assert.equal(
      result.id,
      "file-1",
    );
    assert.equal(
      captured.requestBody.parents[0],
      "receipts-folder",
    );
    assert.equal(
      captured.requestBody.name,
      "receipt_2026_08.jpg",
    );
    assert.equal(
      captured.media.mimeType,
      "image/jpeg",
    );
  },
);


test(
  "fails closed when receipts folder is not writable",
  async () => {
    const service =
      new GoogleDriveService(
        {} as any,
      ) as any;
    service.getFileMetadata =
      async () => ({
        id:"receipts-folder",
        name:"Receipts",
        mimeType:"application/vnd.google-apps.folder",
        trashed:false,
        parents:[],
        capabilities:{
          canAddChildren:false,
          canEdit:false,
        },
      });

    await assert.rejects(
      service.uploadReceiptFile(
        "workspace-1",
        {
          receiptsFolderId:"receipts-folder",
          fileName:"receipt.jpg",
          mimeType:"image/jpeg",
          bytes:new Uint8Array([1]),
        },
      ),
      /GOOGLE_RECEIPT_FOLDER_NOT_WRITABLE/,
    );
  },
);
