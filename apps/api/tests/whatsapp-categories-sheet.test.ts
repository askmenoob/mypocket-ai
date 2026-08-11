import assert from "node:assert/strict";
import test from "node:test";

import {
  WhatsAppService,
} from "../src/modules/whatsapp/whatsapp.service.js";


test(
  "lists every category configured in the workspace Categories tab",
  async () => {
    const service =
      new WhatsAppService({
        prisma:{},
      } as any) as any;

    service.transactionService = {
      getSheetCategoryNames:async (workspaceId:string) => {
        assert.equal(
          workspaceId,
          "workspace-business",
        );
        return [
          "Sales",
          "Marketing",
          "Office",
          "Salary",
          "Supplier",
          "Rental",
          "Utilities",
          "Travel",
          "Tax",
          "Others",
        ];
      },
    };

    let reply = "";
    service.safeSendWebhookReply =
      async (_normalized:any, text:string) => {
        reply = text;
      };

    await service.handleCategoriesCommand(
      "workspace-business",
      {},
      "ms",
    );

    for(const category of [
      "Sales",
      "Marketing",
      "Office",
      "Salary",
      "Supplier",
      "Rental",
      "Utilities",
      "Travel",
      "Tax",
      "Others",
    ]){
      assert.match(
        reply,
        new RegExp(`• ${category}\\b`),
      );
    }
  },
);
