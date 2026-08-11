import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMyPocketRootFolderName,
} from "../../src/modules/google/drive/google-root-folder-name.js";


test(
  "builds plan-aware MyPocket root folder names",
  () => {
    assert.equal(
      buildMyPocketRootFolderName(
        "PERSONAL",
        "  NikazFarhKB@Gmail.com  ",
      ),
      "MyPocket AI Personal Pro (nikazfarhkb@gmail.com)",
    );

    assert.equal(
      buildMyPocketRootFolderName(
        "FAMILY",
        "nikazfarhkb@gmail.com",
      ),
      "MyPocket AI Family (nikazfarhkb@gmail.com)",
    );

    assert.equal(
      buildMyPocketRootFolderName(
        "BUSINESS",
        "nikazfarhkb@gmail.com",
      ),
      "MyPocket AI Business (nikazfarhkb@gmail.com)",
    );
  },
);


test(
  "keeps a useful plan name when owner email is unavailable",
  () => {
    assert.equal(
      buildMyPocketRootFolderName(
        "PERSONAL_PRO",
        null,
      ),
      "MyPocket AI Personal Pro",
    );
  },
);
