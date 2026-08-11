import assert from "node:assert/strict";
import test from "node:test";

import {
  WhatsAppService,
} from "../src/modules/whatsapp/whatsapp.service.js";


function payload(
  text:string,
  id:string,
){

  return {
    event:"messages.upsert",
    instance:"demo",
    data:{
      key:{
        fromMe:false,
        remoteJid:"60123456789@s.whatsapp.net",
        id,
      },
      message:{
        conversation:
          text,
      },
    },
  };

}


function transactions(){

  const now =
    new Date();

  return [
    {
      id:"tx-newest",
      amount:"40",
      currency:"MYR",
      type:"EXPENSE",
      description:"petrol",
      transactionDate:
        new Date(
          now.getTime(),
        ),
      category:{name:"Transport"},
      merchant:{name:"Shell"},
      paymentMethod:{name:"Card"},
    },
    {
      id:"tx-second",
      amount:"15",
      currency:"MYR",
      type:"EXPENSE",
      description:"lunch",
      transactionDate:
        new Date(
          now.getTime(),
        ),
      category:{name:"Food"},
      merchant:{name:"KFC"},
      paymentMethod:{name:"Cash"},
    },
  ];

}


function createService(
  role:
    | "OWNER"
    | "ADMIN"
    | "MEMBER" = "OWNER",
){

  const app = {
    prisma:{
      whatsAppInstance:{
        findUnique:async () => ({
          workspaceId:"workspace-1",
          instanceName:"demo",
          botAlias:"bot",
        }),
      },
    },
  };

  const service =
    new WhatsAppService(
      app as any,
    ) as any;

  const replies:string[] = [];

  service.findWebhookActorMember =
    async () => ({
      userId:"user-1",
      role,
      user:{
        email:"user@example.com",
      },
    });
  service.getWorkspaceReplyLanguage =
    async () => "ms";
  service.getWorkspaceSheetTransactions =
    async () => transactions();
  service.safeSendWebhookReply =
    async (_normalized:any, reply:string) => {
      replies.push(
        reply,
      );
    };

  return {
    service,
    replies,
  };

}


test(
  "Owner deletes the exact transaction number from the latest list snapshot",
  async () => {
    const harness =
      createService(
        "OWNER",
      );

    const deletedIds:string[] = [];
    harness.service.transactionService = {
      bulkDeleteSheetTransactions:
        async (
          role:string,
          workspaceId:string,
          ids:string[],
        ) => {
          assert.equal(
            role,
            "OWNER",
          );
          assert.equal(
            workspaceId,
            "workspace-1",
          );
          deletedIds.push(
            ...ids,
          );
          return {
            requestedCount:1,
            deletedCount:1,
            deletedIds:ids,
            missingIds:[],
            marker:"[DELETED]",
          };
        },
    };

    const listed =
      await harness.service
        .handleEvolutionWebhook(
          payload(
            "!list",
            "list-1",
          ),
        );

    assert.equal(
      listed.count,
      2,
    );
    assert.match(
      harness.replies[0],
      /!delete <nombor>.*5 minit/,
    );

    const deleted =
      await harness.service
        .handleEvolutionWebhook(
          payload(
            "!delete 2",
            "delete-1",
          ),
        );

    assert.deepEqual(
      deletedIds,
      [
        "tx-second",
      ],
    );
    assert.equal(
      deleted.message,
      "WhatsApp transaction deleted",
    );
    assert.match(
      harness.replies[1],
      /Transaksi 2 telah ditanda \[DELETED\]/,
    );

    const repeated =
      await harness.service
        .handleEvolutionWebhook(
          payload(
            "!delete 2",
            "delete-2",
          ),
        );

    assert.equal(
      repeated.normalized.reason,
      "TRANSACTION_LIST_SNAPSHOT_MISSING",
    );
    assert.deepEqual(
      deletedIds,
      [
        "tx-second",
      ],
    );
  },
);


test(
  "Member cannot use ordinal transaction deletion",
  async () => {
    const harness =
      createService(
        "MEMBER",
      );

    let deleteCalls = 0;
    harness.service.transactionService = {
      bulkDeleteSheetTransactions:
        async () => {
          deleteCalls += 1;
          throw new Error(
            "must not execute",
          );
        },
    };

    await harness.service
      .handleEvolutionWebhook(
        payload(
          "!list",
          "member-list",
        ),
      );

    assert.doesNotMatch(
      harness.replies[0],
      /!delete <nombor>/,
    );

    const result =
      await harness.service
        .handleEvolutionWebhook(
          payload(
            "!delete 1",
            "member-delete",
          ),
        );

    assert.equal(
      result.message,
      "WhatsApp command blocked",
    );
    assert.equal(
      result.commandKind,
      "delete",
    );
    assert.equal(
      deleteCalls,
      0,
    );
    assert.match(
      harness.replies[1],
      /Owner\/Admin/,
    );
  },
);


test(
  "partial Sheet failure keeps the snapshot available for a safe retry",
  async () => {
    const harness =
      createService(
        "ADMIN",
      );

    let deleteCalls = 0;
    harness.service.transactionService = {
      bulkDeleteSheetTransactions:
        async (_role:string, _workspaceId:string, ids:string[]) => {
          deleteCalls += 1;

          if(deleteCalls === 1){
            throw new Error(
              "SIMULATED_BACKUP_DELETE_FAILURE",
            );
          }

          return {
            requestedCount:1,
            deletedCount:1,
            deletedIds:ids,
            missingIds:[],
            marker:"[DELETED]",
          };
        },
    };

    await harness.service
      .handleEvolutionWebhook(
        payload(
          "!list",
          "retry-list",
        ),
      );

    const originalConsoleError =
      console.error;
    console.error =
      () => {};

    let first:any;

    try{
      first =
        await harness.service
          .handleEvolutionWebhook(
            payload(
              "!delete 1",
              "retry-delete-1",
            ),
          );
    }finally{
      console.error =
        originalConsoleError;
    }

    assert.equal(
      first.normalized.reason,
      "TRANSACTION_DELETE_FAILED",
    );
    assert.match(
      harness.replies[1],
      /!delete 1.*cuba semula/,
    );

    const retried =
      await harness.service
        .handleEvolutionWebhook(
          payload(
            "!delete 1",
            "retry-delete-2",
          ),
        );

    assert.equal(
      retried.message,
      "WhatsApp transaction deleted",
    );
    assert.equal(
      retried.transactionId,
      "tx-newest",
    );
    assert.equal(
      deleteCalls,
      2,
    );
  },
);
