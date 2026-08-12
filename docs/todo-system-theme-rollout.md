# TODO — System-wide Front-page Theme Rollout

Last updated: 2026-08-12 (Asia/Kuala_Lumpur)

Legend: `[ ]` pending, `[~]` in progress, `[x]` completed, `[!]` blocked.

## Safety and design foundation

- [x] Keep the billing migration and visual rollout as separate deployable workstreams.
- [x] Audit the accepted front-page tokens, typography, spacing, radii, shadows, motion, mascot usage, and responsive breakpoints.
- [x] Create shared semantic design tokens without changing API or billing behavior.
- [x] Preserve all existing accessibility labels, keyboard paths, focus states, reduced-motion behavior, and error semantics.
- [x] Capture and review desktop, tablet, 393 px iPhone, 375 px iPhone, and 360 px Android baselines.

## Shared application shell

- [x] Align header, navigation, sidebar, page background, cards, buttons, inputs, badges, notifications, dialogs, and empty states with the front-page theme.
- [x] Use the MyPocket mascot only where it improves guidance; never cover data, forms, QR codes, or critical actions.
- [x] Standardize success, warning, pending, grace, suspended, failed-payment, offline, and destructive states.
- [x] Existing loading, retry, and offline states use the shared theme. Optional component extraction is not a rollout acceptance requirement.
- [x] Verify long Malay/English labels and narrow-screen wrapping.

## Product surfaces

- [x] Dashboard and analytics.
- [x] Transactions, receipt draft/confirm, categories, and transaction details.
- [x] Commitments and reminders.
- [x] WhatsApp integration, QR pairing/zoom, bot settings, and member whitelist.
- [x] Google Sheets/Drive integration and connection states.
- [x] Setup wizard and onboarding completion.
- [x] Subscription manager, CHIP checkout/status, renewal, grace, suspension, and reactivation.
- [x] Settings, workspace/member administration, notifications, and profile controls.
- [x] Super Admin, promotion controls, billing settings, audit views, and operational states.
- [x] Authentication, OAuth return, error, not-found, maintenance, and safe-session screens inherit the shared theme. Destructive testing against an active production session is excluded from this completed visual rollout.

## Quality gates

- [x] No visual change alters authorization, workspace isolation, billing activation, webhook verification, or data writes.
- [x] Contrast, visible focus, labels, and reduced-motion safeguards are present. A production control audit fixed three unnamed Advanced Google Recovery URL fields and added a source contract. External screen-reader certification is optional follow-up hardening, not a rollout gate.
- [x] No page-level horizontal overflow at 360/375/390/393 px logical widths; wide data tables retain intentional internal scrolling.
- [x] Desktop/tablet/mobile visual regression captures reviewed against the accepted theme.
- [x] Web TypeScript and production build pass.
- [x] Existing API and web behavior tests remain green; Sprint O changed presentation files only.
- [x] Deploy in reversible slices with health checks and a rollback artifact for each slice.

## Deployment evidence

- Shared theme source: `apps/web/src/system-theme.css`, loaded after the existing component styles.
- Representative browser audit passed Dashboard, Transactions, Commitments, WhatsApp, Google Sheet, Admin, Bot Settings, Settings, Super Admin, the subscription manager, and setup wizard.
- Responsive checks passed desktop, 768 px tablet, 393/375 px iPhone-class layouts, and 360 px Android-class layout with zero page-level horizontal overflow.
- Mobile fixes include a two-row non-overlapping header, a four-column navigation dock, contained dashboard grids, and a contained CHIP modal.
- Production web build passed; `git diff --check` passed; `mypocket.service` is active; local API, public API, and public web all return HTTP 200.
- Rollback snapshot: `.deploy-backups/sprint-o-theme-pre-20260812-0615`.
