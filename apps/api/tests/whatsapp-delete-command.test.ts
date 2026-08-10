import assert from "node:assert/strict";
import test from "node:test";

import {
  WhatsAppCommandParser,
} from "../src/modules/whatsapp/whatsapp-command.parser.js";


test(
  "parses delete transaction number",
  () => {
    assert.deepEqual(
      WhatsAppCommandParser.deleteTransaction(
        "delete 2",
      ),
      {
        number:2,
      },
    );
  },
);


test(
  "parses triggered delete transaction number",
  () => {
    assert.deepEqual(
      WhatsAppCommandParser.deleteTransaction(
        "!delete 5",
      ),
      {
        number:5,
      },
    );
  },
);


test(
  "parses Malay delete transaction number",
  () => {
    assert.deepEqual(
      WhatsAppCommandParser.deleteTransaction(
        "padam 3",
      ),
      {
        number:3,
      },
    );
  },
);


test(
  "does not collide with undo delete last",
  () => {
    assert.equal(
      WhatsAppCommandParser.deleteTransaction(
        "delete last",
      ),
      null,
    );
  },
);


test(
  "does not collide with commitment deletion",
  () => {
    assert.equal(
      WhatsAppCommandParser.deleteTransaction(
        "delete commitment car",
      ),
      null,
    );
  },
);


test(
  "rejects zero and non numeric delete targets",
  () => {
    assert.equal(
      WhatsAppCommandParser.deleteTransaction(
        "delete 0",
      ),
      null,
    );

    assert.equal(
      WhatsAppCommandParser.deleteTransaction(
        "delete abc",
      ),
      null,
    );
  },
);
