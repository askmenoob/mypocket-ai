import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import test from "node:test";

import {
  GOOGLE_IDENTITY_SCOPES,
  GOOGLE_WORKSPACE_SCOPES,
} from "../src/config/google-scopes.js";
import {
  resolveDashboardUrl,
} from "../src/config/dashboard-url.js";
import {
  OAUTH_FLOW_COOKIE_MAX_AGE_SECONDS,
  createOAuthFlow,
  oauthValuesMatch,
  readCookie,
  serializeOAuthCookie,
} from "../src/shared/auth/oauth-flow.security.js";
import {
  buildGoogleAuthorizationUrl,
  buildGoogleTokenRequestBody,
} from "../src/shared/google/google-oauth-request.js";


test(
  "Google identity login requests identity scopes only",
  () => {
    assert.deepEqual(
      GOOGLE_IDENTITY_SCOPES,
      [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
    );

    assert.equal(
      GOOGLE_IDENTITY_SCOPES.some(
        (scope) =>
          scope.includes("drive")
          ||
          scope.includes("spreadsheets"),
      ),
      false,
    );
  },
);


test(
  "Google workspace authorization uses only non-sensitive per-file Drive access",
  () => {
    const workspaceScopes =
      new Set<string>(
        GOOGLE_WORKSPACE_SCOPES,
      );

    assert.equal(
      workspaceScopes.has(
        "https://www.googleapis.com/auth/drive",
      ),
      false,
    );

    assert.equal(
      workspaceScopes.has(
        "https://www.googleapis.com/auth/drive.file",
      ),
      true,
    );

    assert.equal(
      workspaceScopes.has(
        "https://www.googleapis.com/auth/spreadsheets",
      ),
      false,
    );
  },
);


test(
  "OAuth flow creates independent state and S256 PKCE secrets",
  () => {
    const first =
      createOAuthFlow();

    const second =
      createOAuthFlow();

    assert.notEqual(
      first.state,
      second.state,
    );
    assert.notEqual(
      first.verifier,
      second.verifier,
    );
    assert.match(
      first.challenge,
      /^[A-Za-z0-9_-]{43}$/,
    );
    assert.equal(
      first.challengeMethod,
      "S256",
    );
  },
);


test(
  "Google authorization URL carries protected state, PKCE, and incremental scopes",
  () => {
    const flow =
      createOAuthFlow();

    const identityUrl =
      new URL(
        buildGoogleAuthorizationUrl({
          clientId:
            "client-id",
          redirectUri:
            "https://api.imai.my/api/v1/auth/google/callback",
          scopes:
            GOOGLE_IDENTITY_SCOPES,
          accessType:
            "online",
          state:
            flow.state,
          codeChallenge:
            flow.challenge,
        }),
      );

    assert.equal(
      identityUrl.searchParams.get("state"),
      flow.state,
    );
    assert.equal(
      identityUrl.searchParams.get("code_challenge"),
      flow.challenge,
    );
    assert.equal(
      identityUrl.searchParams.get("code_challenge_method"),
      "S256",
    );
    assert.equal(
      identityUrl.searchParams.get("scope"),
      GOOGLE_IDENTITY_SCOPES.join(" "),
    );

    const workspaceUrl =
      new URL(
        buildGoogleAuthorizationUrl({
          clientId:
            "client-id",
          redirectUri:
            "https://api.imai.my/api/v1/google/oauth/callback",
          scopes:
            GOOGLE_WORKSPACE_SCOPES,
          accessType:
            "offline",
          prompt:
            "consent",
          includeGrantedScopes:
            true,
          state:
            "signed-state",
          codeChallenge:
            flow.challenge,
        }),
      );

    assert.equal(
      workspaceUrl.searchParams.get("include_granted_scopes"),
      "true",
    );
    assert.equal(
      workspaceUrl.searchParams.get("access_type"),
      "offline",
    );
    assert.equal(
      workspaceUrl.searchParams.get("prompt"),
      "consent",
    );
    assert.doesNotMatch(
      workspaceUrl.searchParams.get("scope") ?? "",
      /auth\/drive(?:\s|$)/,
    );
  },
);


test(
  "Google token exchange always binds the authorization code to PKCE",
  () => {
    const body =
      buildGoogleTokenRequestBody({
        clientId:
          "client-id",
        clientSecret:
          "client-secret",
        redirectUri:
          "https://api.imai.my/callback",
        code:
          "authorization-code",
        codeVerifier:
          "pkce-verifier",
      });

    assert.equal(
      body.get("code_verifier"),
      "pkce-verifier",
    );
    assert.equal(
      body.get("grant_type"),
      "authorization_code",
    );
  },
);


test(
  "OAuth cookies are short-lived, secure, HttpOnly, SameSite Lax",
  () => {
    const cookie =
      serializeOAuthCookie(
        "__Host-imai_test",
        "hello world",
      );

    assert.match(
      cookie,
      new RegExp(
        `Max-Age=${OAUTH_FLOW_COOKIE_MAX_AGE_SECONDS}`,
      ),
    );
    assert.match(cookie, /Path=\//);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Lax/);
    assert.equal(
      readCookie(
        "x=1; __Host-imai_test=hello%20world; y=2",
        "__Host-imai_test",
      ),
      "hello world",
    );
    assert.equal(
      oauthValuesMatch("expected", "expected"),
      true,
    );
    assert.equal(
      oauthValuesMatch("expected", "tampered"),
      false,
    );
  },
);


test(
  "Google login does not create a fake connected Drive account",
  () => {
    const authService =
      readFileSync(
        resolve(
          process.cwd(),
          "src/modules/auth/auth.service.ts",
        ),
        "utf8",
      );

    const authController =
      readFileSync(
        resolve(
          process.cwd(),
          "src/modules/auth/auth.controller.ts",
        ),
        "utf8",
      );

    assert.doesNotMatch(
      authService,
      /createGoogleAccount\s*\(/,
    );
    assert.doesNotMatch(
      authController,
      /completeGoogleSetup\s*\(/,
    );
  },
);


test(
  "OAuth callbacks never send users to the API host",
  () => {
    assert.equal(
      resolveDashboardUrl(
        "https://api.imai.my",
      ),
      "https://app.imai.my/",
    );

    assert.equal(
      resolveDashboardUrl(
        "https://app.imai.my",
      ),
      "https://app.imai.my/",
    );

    assert.equal(
      resolveDashboardUrl(
        "http://127.0.0.1:3001",
      ),
      "http://127.0.0.1:3001/",
    );
  },
);


test(
  "login and setup explain the separate minimum-access Google flows",
  () => {
    const webSource =
      readFileSync(
        resolve(
          process.cwd(),
          "../web/src/app-bootstrap.tsx",
        ),
        "utf8",
      );

    assert.match(
      webSource,
      /Log masuk hanya berkongsi nama dan alamat e-mel anda/,
    );
    assert.match(
      webSource,
      /MyPocket tidak meminta akses ke seluruh Google Drive/,
    );
  },
);
