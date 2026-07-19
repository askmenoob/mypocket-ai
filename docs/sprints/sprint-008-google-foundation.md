# Sprint 008 - Google Workspace Integration Foundation

## Release

Tag:

sprint-008-google-foundation

Commit:

9e5dba3


---

# Objective

Build Google Workspace integration foundation for MyPocket Platform.

This sprint establishes the Google account connection layer required for future:

- Google Sheets integration
- Google Drive integration
- Google OAuth production flow


---

# Completed Features

## Database

GoogleAccount model enhanced with:

- accessToken
- refreshToken
- expiresAt
- scopes
- status
- connectedAt


Migration:

20260719122538_enhance_google_account



---

# Google Module Architecture

Location:


apps/api/src/modules/google/



Files:


google.controller.ts
google.repository.ts
google.routes.ts
google.schemas.ts
google.service.ts
google.types.ts
index.ts



---

# API Endpoints


## Google Status


GET /api/v1/workspace/google/status



Purpose:

Check current workspace Google connection.


---

## Google Connect


POST /api/v1/workspace/google/connect



Permission:

Allowed:

- OWNER
- ADMIN


Denied:

- MEMBER
- VIEWER


---

## Google Disconnect


POST /api/v1/workspace/google/disconnect



Permission:

Allowed:

- OWNER
- ADMIN


Denied:

- MEMBER
- VIEWER


---

# RBAC Verification


## Connect Test


| Role | Result |
|---|---|
| OWNER | PASS |
| ADMIN | PASS |
| MEMBER | DENIED 403 |
| VIEWER | DENIED 403 |


## Disconnect Test


| Role | Result |
|---|---|
| OWNER | PASS |
| ADMIN | PASS |
| MEMBER | DENIED 403 |
| VIEWER | DENIED 403 |


---

# Security Architecture


Authorization flow:



Request
|
v
JWT Authentication
|
v
Workspace Membership Lookup
|
v
Database Role Validation
|
v
Service Authorization
|
v
Google Operation



Important:

Role permission is validated from workspace membership data.

JWT role is not trusted as the only security source.


---

# Test Tools Added



apps/api/tools/auth/

generate-owner-jwt.ts
generate-admin-jwt.ts
generate-member-jwt.ts
generate-viewer-jwt.ts

apps/api/tools/debug/

find-workspace-members.ts



---

# Sprint Result


Status:

COMPLETE


Release:

sprint-008-google-foundation


Next Sprint:

Sprint 009 - Google OAuth Production Integration

