import assert from "node:assert/strict";
import test from "node:test";

import {
  GoogleSettingsService,
} from "../src/modules/google/settings/google-settings.service.js";
import {
  GoogleTemplateRepository,
} from "../src/modules/google/templates/google-template.repository.js";


test(
  "Personal Basic remains the default until Personal Pro access is active",
  () => {
    const service =
      new GoogleSettingsService(
        {
          prisma:{},
        } as any,
      ) as any;

    assert.equal(
      service.resolvePersonalTemplateTier(null),
      "BASIC",
    );
    assert.equal(
      service.resolvePersonalTemplateTier({
        plan:"PERSONAL_PRO",
        status:"PENDING",
        accessState:"PENDING",
      }),
      "BASIC",
    );
    assert.equal(
      service.resolvePersonalTemplateTier({
        plan:"PERSONAL_PRO",
        status:"ACTIVE",
        accessState:"ACTIVE",
      }),
      "PRO",
    );
    assert.equal(
      service.resolvePersonalTemplateTier({
        plan:"PERSONAL_PRO",
        status:"ACTIVE",
        accessState:"SUSPENDED",
      }),
      "BASIC",
    );
  },
);


test(
  "Personal templates are selected by an explicit tier version prefix",
  async () => {
    const calls:Array<any> = [];
    const repository =
      new GoogleTemplateRepository(
        {
          googleTemplate:{
            findFirst:async (input:any) => {
              calls.push(input);
              return input;
            },
          },
        } as any,
      );

    await repository.findActivePersonalByTier("BASIC");
    await repository.findActivePersonalByTier("PRO");

    assert.equal(
      calls[0].where.version.startsWith,
      "basic-",
    );
    assert.equal(
      calls[1].where.version.startsWith,
      "pro-",
    );
  },
);
