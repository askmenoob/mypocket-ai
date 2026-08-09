import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import test from "node:test";

import {
  AuthService,
  selectLoginMembership,
} from "../src/modules/auth/auth.service.js";
import {
  GoogleSettingsController,
} from "../src/modules/google/settings/google-settings.controller.js";
import {
  WorkspaceService,
} from "../src/modules/workspace/workspace.service.js";


test(
  "Google login prefers a shared workspace over a personal workspace",
  () => {

    const personal = {
      workspaceId:
        "personal-1",
      workspace:{
        type:
          "PERSONAL",
      },
    };

    const family = {
      workspaceId:
        "family-1",
      workspace:{
        type:
          "FAMILY",
      },
    };

    assert.equal(
      selectLoginMembership([
        personal,
        family,
      ]),
      family,
    );

  },
);


test(
  "a stale workspace token recovers to a valid shared membership",
  async () => {

    const service =
      Object.create(
        AuthService.prototype,
      ) as any;

    service.repository = {
      findUserSession:
        async () => ({
          id:
            "user-1",
          email:
            "member@example.com",
          name:
            "Member",
          memberships:[
            {
              workspaceId:
                "family-1",
              role:
                "ADMIN",
              workspace:{
                id:
                  "family-1",
                name:
                  "Family workspace",
                type:
                  "FAMILY",
                onboardingCompletedAt:
                  new Date(),
              },
            },
          ],
        }),
    };

    service.tokenService = {
      generate:
        async (
          userId:string,
          email:string,
          workspaceId:string,
          role:string,
        ) => {

          assert.deepEqual(
            {
              userId,
              email,
              workspaceId,
              role,
            },
            {
              userId:
                "user-1",
              email:
                "member@example.com",
              workspaceId:
                "family-1",
              role:
                "ADMIN",
            },
          );

          return "recovered-token";

        },
    };

    const result =
      await service.getCurrentSession(
        "user-1",
        "removed-workspace",
      );

    assert.equal(
      result.workspace.id,
      "family-1",
    );

    assert.equal(
      result.recoveredWorkspace,
      true,
    );

    assert.equal(
      result.sessionToken,
      "recovered-token",
    );

  },
);


test(
  "a valid selected workspace does not get replaced",
  async () => {

    const service =
      Object.create(
        AuthService.prototype,
      ) as any;

    service.repository = {
      findUserSession:
        async () => ({
          id:
            "user-1",
          email:
            "member@example.com",
          name:
            "Member",
          memberships:[
            {
              workspaceId:
                "personal-1",
              role:
                "OWNER",
              workspace:{
                id:
                  "personal-1",
                name:
                  "Personal workspace",
                type:
                  "PERSONAL",
                onboardingCompletedAt:
                  null,
              },
            },
            {
              workspaceId:
                "family-1",
              role:
                "ADMIN",
              workspace:{
                id:
                  "family-1",
                name:
                  "Family workspace",
                type:
                  "FAMILY",
                onboardingCompletedAt:
                  new Date(),
              },
            },
          ],
        }),
    };

    service.tokenService = {
      generate:
        async () => {
          throw new Error(
            "token should not be regenerated",
          );
        },
    };

    const result =
      await service.getCurrentSession(
        "user-1",
        "personal-1",
      );

    assert.equal(
      result.workspace.id,
      "personal-1",
    );

    assert.equal(
      result.recoveredWorkspace,
      false,
    );

    assert.equal(
      result.sessionToken,
      undefined,
    );

  },
);


test(
  "Google settings reads only the workspace carried by the session token",
  async () => {

    const controller =
      new GoogleSettingsController({
        prisma:{},
      } as any);

    const requestedWorkspaceIds:string[] = [];

    Object.assign(
      controller,
      {
        service:{
          getSettings:
            async (
              workspaceId:string,
            ) => {

              requestedWorkspaceIds.push(
                workspaceId,
              );

              return null;

            },
        },
      },
    );

    const result =
      await controller.get({
        jwtVerify:
          async () => undefined,
        user:{
          userId:
            "user-1",
          workspaceId:
            "personal-1",
        },
      } as any);

    assert.equal(
      result,
      null,
    );

    assert.deepEqual(
      requestedWorkspaceIds,
      [
        "personal-1",
      ],
    );

  },
);


test(
  "Google settings GET permits members while mutations remain elevated",
  () => {

    const source =
      readFileSync(
        resolve(
          process.cwd(),
          "src/modules/google/settings/google-settings.routes.ts",
        ),
        "utf8",
      );

    const firstPost =
      source.indexOf(
        "app.post(",
      );

    const getRoute =
      source.slice(
        0,
        firstPost,
      );

    const mutationRoutes =
      source.slice(
        firstPost,
      );

    assert.match(
      getRoute,
      /Roles\.MEMBER/,
    );

    assert.doesNotMatch(
      mutationRoutes,
      /Roles\.MEMBER/,
    );

  },
);


test(
  "an already accepted invite can issue the shared workspace token again",
  async () => {

    const service =
      Object.create(
        WorkspaceService.prototype,
      ) as any;

    service.app = {
      prisma:{
        workspaceInvite:{
          findUnique:
            async () => ({
              id:
                "invite-1",
              email:
                "member@example.com",
              status:
                "ACCEPTED",
              acceptedById:
                "user-1",
              workspaceId:
                "family-1",
            }),
        },
        workspaceMember:{
          findUnique:
            async () => ({
              id:
                "member-1",
              role:
                "ADMIN",
            }),
        },
      },
    };

    service.tokenService = {
      generate:
        async (
          userId:string,
          email:string,
          workspaceId:string,
          role:string,
        ) => {

          assert.deepEqual(
            {
              userId,
              email,
              workspaceId,
              role,
            },
            {
              userId:
                "user-1",
              email:
                "member@example.com",
              workspaceId:
                "family-1",
              role:
                "ADMIN",
            },
          );

          return "shared-token";

        },
    };

    const result =
      await service.acceptInvite({
        userId:
          "user-1",
        email:
          "member@example.com",
        token:
          "invite-token",
      });

    assert.equal(
      result.token,
      "shared-token",
    );

    assert.equal(
      result.workspaceId,
      "family-1",
    );

  },
);


test(
  "dashboard loads and switches workspaces through the authenticated workspace APIs",
  () => {

    const source =
      readFileSync(
        resolve(
          process.cwd(),
          "../web/src/app-bootstrap.tsx",
        ),
        "utf8",
      );

    assert.match(
      source,
      /"\/workspace\/all"/,
    );

    assert.match(
      source,
      /\/workspace\/\$\{encodeURIComponent\(nextWorkspaceId\)\}\/switch/,
    );

    assert.match(
      source,
      /className="workspace workspaceSelect"/,
    );

    assert.match(
      source,
      /initialDashboardToken/,
    );

    assert.match(
      source,
      /me\?\.recoveredWorkspace/,
    );

    assert.match(
      source,
      /me\?\.sessionToken/,
    );

    assert.match(
      source,
      /actorRole === "OWNER"[\s\S]*isSharedWorkspace[\s\S]*Google Sheet access notice/,
    );

    assert.match(
      source,
      /Kebenaran ini ditentukan oleh Owner dan tidak menjejaskan akses bot/,
    );

  },
);
