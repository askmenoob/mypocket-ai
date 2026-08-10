import assert from "node:assert/strict";
import test from "node:test";

import {
  WhatsAppTransactionListSnapshotStore,
} from "../src/modules/whatsapp/whatsapp-list-snapshot.store.js";


test(
  "resolves exact displayed transaction id",
  () => {
    const store =
      new WhatsAppTransactionListSnapshotStore();

    const now =
      new Date(
        "2026-08-07T00:00:00.000Z",
      );

    store.save({
      workspaceId:"workspace-a",
      userId:"user-a",
      transactionIds:[
        "tx-newest",
        "tx-second",
        "tx-third",
      ],
      now,
    });

    assert.deepEqual(
      store.resolve({
        workspaceId:"workspace-a",
        userId:"user-a",
        number:2,
        now,
      }),
      {
        status:"ok",
        transactionId:"tx-second",
      },
    );
  },
);


test(
  "rejects ordinal outside displayed snapshot",
  () => {
    const store =
      new WhatsAppTransactionListSnapshotStore();

    const now =
      new Date(
        "2026-08-07T00:00:00.000Z",
      );

    store.save({
      workspaceId:"workspace-a",
      userId:"user-a",
      transactionIds:[
        "tx-one",
        "tx-two",
      ],
      now,
    });

    assert.deepEqual(
      store.resolve({
        workspaceId:"workspace-a",
        userId:"user-a",
        number:3,
        now,
      }),
      {
        status:"out_of_range",
      },
    );
  },
);


test(
  "expires snapshot after five minutes",
  () => {
    const store =
      new WhatsAppTransactionListSnapshotStore();

    store.save({
      workspaceId:"workspace-a",
      userId:"user-a",
      transactionIds:[
        "tx-one",
      ],
      now:new Date(
        "2026-08-07T00:00:00.000Z",
      ),
    });

    assert.deepEqual(
      store.resolve({
        workspaceId:"workspace-a",
        userId:"user-a",
        number:1,
        now:new Date(
          "2026-08-07T00:05:00.001Z",
        ),
      }),
      {
        status:"expired",
      },
    );
  },
);


test(
  "isolates snapshots by workspace and actor",
  () => {
    const store =
      new WhatsAppTransactionListSnapshotStore();

    const now =
      new Date(
        "2026-08-07T00:00:00.000Z",
      );

    store.save({
      workspaceId:"workspace-a",
      userId:"user-a",
      transactionIds:[
        "tx-private",
      ],
      now,
    });

    assert.deepEqual(
      store.resolve({
        workspaceId:"workspace-a",
        userId:"user-b",
        number:1,
        now,
      }),
      {
        status:"missing",
      },
    );

    assert.deepEqual(
      store.resolve({
        workspaceId:"workspace-b",
        userId:"user-a",
        number:1,
        now,
      }),
      {
        status:"missing",
      },
    );
  },
);


test(
  "clears snapshot after mutation",
  () => {
    const store =
      new WhatsAppTransactionListSnapshotStore();

    const now =
      new Date(
        "2026-08-07T00:00:00.000Z",
      );

    store.save({
      workspaceId:"workspace-a",
      userId:"user-a",
      transactionIds:[
        "tx-one",
      ],
      now,
    });

    store.clear(
      "workspace-a",
      "user-a",
    );

    assert.deepEqual(
      store.resolve({
        workspaceId:"workspace-a",
        userId:"user-a",
        number:1,
        now,
      }),
      {
        status:"missing",
      },
    );
  },
);
