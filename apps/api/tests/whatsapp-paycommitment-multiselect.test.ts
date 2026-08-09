import assert from "node:assert/strict";
import test from "node:test";

import {
  WhatsAppService,
} from "../src/modules/whatsapp/whatsapp.service.js";

const service =
  Object.create(
    WhatsAppService.prototype,
  ) as any;

const draft = {
  workspaceId:"workspace-test",
  actorUserId:"user-test",
  role:"OWNER",
  language:"ms",
  items:[
    {
      id:"cm1",
      name:"Bayaran Rumah",
      amount:"1400.00",
      dueDay:15,
      status:"UNPAID",
    },
    {
      id:"cm2",
      name:"Kereta",
      amount:"980.00",
      dueDay:10,
      status:"UNPAID",
    },
    {
      id:"cm3",
      name:"Elektrik",
      amount:"220.00",
      dueDay:20,
      status:"UNPAID",
    },
  ],
  expiresAt:
    Date.now() + 600000,
};

test(
  "paycommitment accepts 1,2,3",
  () => {

    const selected =
      service.findPayCommitmentSelections(
        draft,
        "1,2,3",
      );

    assert.deepEqual(
      selected.map(
        (item:any) => item.id,
      ),
      [
        "cm1",
        "cm2",
        "cm3",
      ],
    );

  },
);

test(
  "paycommitment accepts space-separated selections and removes duplicates",
  () => {

    const selected =
      service.findPayCommitmentSelections(
        draft,
        "1 2 2",
      );

    assert.deepEqual(
      selected.map(
        (item:any) => item.id,
      ),
      [
        "cm1",
        "cm2",
      ],
    );

  },
);

test(
  "paycommitment accepts semua",
  () => {

    const selected =
      service.findPayCommitmentSelections(
        draft,
        "semua",
      );

    assert.equal(
      selected.length,
      3,
    );

  },
);

test(
  "paycommitment rejects invalid mixed selection",
  () => {

    const selected =
      service.findPayCommitmentSelections(
        draft,
        "1,9",
      );

    assert.equal(
      selected,
      null,
    );

  },
);

test(
  "multi confirmation shows selected commitments and total",
  () => {

    const confirmation =
      service.buildPayCommitmentConfirmReply({
        ...draft,
        selectedIds:[
          "cm1",
          "cm2",
          "cm3",
        ],
      });

    assert.match(
      confirmation,
      /Bayaran Rumah/,
    );

    assert.match(
      confirmation,
      /Kereta/,
    );

    assert.match(
      confirmation,
      /Elektrik/,
    );

    assert.match(
      confirmation,
      /Jumlah: RM2,600/,
    );

    assert.match(
      confirmation,
      /!confirm/,
    );

  },
);
