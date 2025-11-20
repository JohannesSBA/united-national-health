This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

![United National Health high-level architecture](docs/Highlevel.png)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Global Admin Console (Governance & Compliance)

The `/globaladmin` area is a server-rendered console dedicated to the highest-tier operators. It never surfaces PHI and focuses exclusively on platform oversight. Key traits:

- **Real data pipeline:** `lib/global-admin-data.ts` queries live Prisma tables for hospital counts, onboarding tasks, deployment status, and administrative audit events.
- **Reusable layout:** Components under `components/admin/` (nav, page template, cards, activity log, PHI banner) deliver a consistent UI with Tailwind styling.
- **Pages shipped:** Dashboard, Hospitals, Administrators, System Monitoring, Security & Compliance, and Settings live under `app/globaladmin/*` and each call `requireGlobalAdmin()` before rendering.
- **Database support:** New Prisma models/migration (`20251115090000_add_admin_dashboard_entities`) add `OnboardingAction`, `AdminActivity`, `SystemStatus`, plus enums to capture governance-only telemetry.
- **Seeding:** `prisma/seed.ts` now provisions hospitals, hospital admins, onboarding workflows, system status entries, and admin activity so the console renders meaningful information immediately after `npx prisma db seed`.

### Security highlights

- **Strict RBAC enforcement:** `lib/require-global-admin.ts` resolves the Better Auth session and validates a `GlobalAdmin` role for every page before data is fetched. Unauthenticated users go to `/login`; non-global roles are redirected home.
- **Server-only rendering:** All admin views are React Server Components, so metrics and audit data never leave the server except as already-rendered HTML.
- **No PHI banner + copy:** A prominent “No PHI Allowed” banner and contextual text reinforce that the console is solely for governance/compliance data.
- **Governance-only tables:** New Prisma models intentionally store non-clinical data (system uptime, onboarding actions, admin activity), preventing accidental exposure of patient information.
- **Environment-driven config:** The Settings page surfaces deployment metadata and trusted origins based on environment variables, helping operators verify security posture without exposing secrets.

## Global Admin Feature Set

### Project structure overview

```
app/
├─ components/
│  └─ admin/
│     ├─ activity-log.tsx            # Filterable activity stream with audit links
│     ├─ actor-lookup-widget.tsx     # Floating quick-lookup panel
│     ├─ admin-page-template.tsx     # Shared layout + actor lookup injection
│     ├─ analytics/                  # Governance analytics cards + exporters
│     ├─ hospitals/                  # Hospital CRUD/onboarding UI fragments
│     ├─ admins/                     # Hospital admin management UI
│     ├─ security/                   # MFA/data-retention/access policy panels
│     └─ system/                     # Maintenance controls + integration UI
├─ globaladmin/
│  ├─ page.tsx                       # Dashboard
│  ├─ hospitals/page.tsx             # Hospital management surface
│  ├─ administrators/page.tsx        # Administrator directory
│  ├─ security/page.tsx              # Security & compliance cockpit
│  ├─ settings/page.tsx              # Platform configuration
│  ├─ system-monitoring/page.tsx     # Maintenance + status history
│  └─ audit/[activityId]/page.tsx    # Per-activity audit detail view
└─ api/globaladmin/
   ├─ actors/[actorId]/route.ts      # Rate-limited actor lookup API
   ├─ analytics/(export|route).ts    # Governance CSV exports
   ├─ audit-logs/(export|route).ts   # Administrative activity API/CSV
   ├─ email-logs/[logId]/route.ts    # Secure per-email downloads
   ├─ email-logs/export/route.ts     # Filtered HTML archive exporter
   ├─ hospitals/(route|[id]/route).ts # Hospital CRUD + status changes
   ├─ hospital-admins/(route|[id]/route).ts
   ├─ access-policies/(route|[id]/route).ts
   ├─ security/alerts/(route|[id]/route).ts
   ├─ system/integrations/(route|[id]/route).ts
   └─ system/settings/route.ts
lib/
├─ auth.ts / require-global-admin.ts # Better Auth session helpers + RBAC guard
├─ global-admin-data.ts              # Server fetchers for dashboard metrics
├─ services/global-admin/*           # Business logic (hospitals, admins, security, etc.)
├─ email.ts / email-templates.ts     # SMTP delivery + AES-256-GCM logging
├─ email-encryption.ts / email-log-tag.ts / rate-limit.ts
└─ contact-utils.ts / utils.ts       # Shared helpers
prisma/
├─ schema.prisma                     # Data models (EmailLog, AdminActivity.metadata, etc.)
└─ migrations/                       # Versioned schema changes (`prisma migrate`)
```

### Platform governance

- **Register/edit/suspend hospitals** via `app/globaladmin/hospitals/page.tsx` using modular components (`HospitalCreateForm`, `HospitalList`, `HospitalDetailsForm`). Backend endpoints: `POST/PATCH /api/globaladmin/hospitals` and `PATCH /api/globaladmin/hospitals/:id`.
- **Approve or reject onboarding workflows** through `/api/globaladmin/onboarding/:actionId`. Decisions automatically drive `Hospital.status`.
- **Deactivate/activate facilities** with `changeHospitalStatus` (sets `HospitalStatus` enum). Status changes propagate everywhere because pages read directly from Prisma.

### User & access management

- **Create, reassign, suspend, and reset Hospital Admin accounts** from `app/globaladmin/administrators/page.tsx`. Client components call `/api/globaladmin/hospital-admins` and `/api/globaladmin/hospital-admins/:userId` (actions: `reassign`, `status`, `resetPassword`).
- **Role policy editor** in Settings updates `RolePolicy` records through `/api/globaladmin/role-policies`, defining which governance permissions each role receives.
- **Activity log** (non-PHI) shows all privileged actions pulled from the `AdminActivity` table and `/api/globaladmin/audit-logs`.

### Security, privacy & compliance

- **MFA enforcement and data-retention forms** hit `/api/globaladmin/system/settings` with keys `mfa_policy` and `data_retention`.
- **Cross-hospital policies** managed in UI (`AccessPolicyPanel`) and `/api/globaladmin/access-policies` endpoints. Policies can be drafted, approved, or revoked without touching clinical data.
- **Security alerts** surface events from `SecurityAlert` with `/api/globaladmin/security/alerts`, including resolution workflow.
- **Governance-only audit log** and `SystemSetting` store compliance controls; PHI is never queried.
- **Email logging, encryption, & exports:** Every outbound template (status notifications, credential emails, password resets) is rendered through server-only HTML in `lib/email-templates.ts`, encrypted with AES-256-GCM using `EMAIL_LOG_SECRET`, persisted to the `EmailLog` table, and exportable via `/api/globaladmin/email-logs/export` (UI filters for recipient, date range, page, limit). If encryption, SMTP config, or delivery fails, the system emits `EMAIL_DELIVERY_FAILURE` security alerts.
- **Per-activity notifications:** Admin activity entries that send notifications append an encoded `emailLogId`. The audit detail view (`/globaladmin/audit/[activityId]`) resolves that reference server-side and lets Global Admins download only the email tied to that specific action—no archive dump required. If no email exists, the UI omits the card entirely.
- **Actor lookup widget:** Every admin page renders a floating bottom-right widget that lets reviewers paste any actor (user) ID and instantly fetch their name, email, status, roles, and hospitals via `/api/globaladmin/actors/:id`.
- **Rate-limited sensitive endpoints:** Actor lookups and email log downloads/exports enforce per-user throttling and emit `AdminActivity` events so every request is auditable (and blocked if abused). CSV/HTML exports include timestamped filenames for easy governance tracking.

### Feature deep dive

- **Dashboard (`/globaladmin`)**
  - Loads aggregates via `getGlobalAdminDashboardData()`/`getAnalyticsSummary()` and renders them in server components.
  - `ActivityLog` (client) offers search/date filters and links into `/globaladmin/audit/[activityId]`.
  - `AnalyticsSummary` + `AnalyticsExportButton` give CSV governance exports.

- **Hospitals (`/globaladmin/hospitals`)**
  - `HospitalCreateForm` normalizes contact info, warns on duplicates, and posts to `/api/globaladmin/hospitals`.
  - `HospitalList` shows status, contact, onboarding tasks, and injects:
    - `HospitalStatusActions`: justification modal, writes status changes, records `emailLogId` metadata, and emails contacts.
    - `HospitalDetailsForm`: inline editing with duplicate detection.
    - `HospitalOnboardingForm`/`HospitalOnboardingActions`: custom tasks + quick approvals.

- **Administrators (`/globaladmin/administrators`)**
  - `AdminCreateForm` handles new hospital admins, including multi-hospital assignments and inline temp password reveal.
  - `AdminList` supports status toggles, hospital reassignments, and credential resets (each hits `/api/globaladmin/hospital-admins/[userId]`).
  - All credential operations trigger `sendTemporaryPasswordEmail`, encrypted logging, and structured metadata.

- **Security & compliance (`/globaladmin/security`)**
  - MFA/data-retention forms submit JSON policies to `/api/globaladmin/system/settings`.
  - `AccessPolicyPanel` orchestrates draft/approve/revoke flows via `/api/globaladmin/access-policies`.
  - `SecurityAlertsPanel` shows live alerts, enabling resolve actions (with audit logging).
  - High-priority onboarding tasks bubble up from `fetchPendingOnboardingActions`.
  - `ActivityLog` here embeds CSV export only (email archives are handled on the detail view).

- **Audit detail (`/globaladmin/audit/[activityId]`)**
  - Fetches the `AdminActivity`, looks up matching user by ID/email/name, and displays metadata.
  - If `metadata.emailLogId` exists, decrypts the exact notification server-side and renders it with a download link to `/api/globaladmin/email-logs/[logId]`.
  - Falls back to legacy `[emailLog:…]` tags for older records.

- **System monitoring (`/globaladmin/system-monitoring`)**
  - `SystemControlsPanel` toggles maintenance mode (with reasons logged) and writes to `SystemSetting`.
  - Displays system health history from `SystemStatus`, plus high-level onboarding throughput.

- **Settings (`/globaladmin/settings`)**
  - Shows deployment version, trusted origins, global vs hospital admin counts.
  - `IntegrationCreateForm` generates tokens, and `IntegrationList` rotates/disables keys via `/api/globaladmin/system/integrations`.
  - `RolePolicyEditor` reads/writes `RolePolicy` JSON to define capabilities per role.

- **Actor lookup widget**
  - Always available via `AdminPageTemplate`, posts to `/api/globaladmin/actors/:id`, enforces rate limits, and logs which Global Admin performed each lookup.

### System configuration & operations

- **Maintenance mode toggle** plus uptime history live on `app/globaladmin/system-monitoring/page.tsx`. Settings persist via `SystemControlsPanel` and `/api/globaladmin/system/settings`.
- **Integration/API key management** uses `/api/globaladmin/system/integrations` (create/rotate/disable) with hashed tokens stored in `IntegrationKey`.

## Detailed Global Admin Branch Delta

Every change in this branch focuses on the `/globaladmin` experience. The rundown below documents each page, backing API endpoint, and infrastructure tweak so reviewers can see exactly what shipped.

### Server-rendered governance pages

- `/globaladmin` (`app/globaladmin/page.tsx`)
  - Pulls consolidated metrics via `getGlobalAdminDashboardData()` and `getAnalyticsSummary()` before rendering anything client-side.
  - Surfaces KPI tiles, onboarding backlog (`PendingActionsList`), system health, a CSV-capable analytics module, and the `ActivityLog` that now links each row to `/globaladmin/security?log={id}` for deep dives.
- `/globaladmin/hospitals` (`app/globaladmin/hospitals/page.tsx`)
  - Calls `listHospitals()` to hydrate `HospitalCreateForm` and `HospitalList`, normalizing child relations (memberships, onboarding actions) for display.
  - Metric tiles summarize registered facilities and account assignments so admins can gauge rollout velocity instantly.
- `/globaladmin/administrators` (`app/globaladmin/administrators/page.tsx`)
  - Executes three concurrent Prisma queries (global admins, hospital admins + memberships, hospital directory) and feeds those records into `AdminCreateForm` + `AdminList`.
  - Presents a carded UI for provisioning new hospital admins, enumerating global operators, and governing local admins (status, assignments, password resets).
- `/globaladmin/system-monitoring` (`app/globaladmin/system-monitoring/page.tsx`)
  - Bundles `SystemControlsPanel` with maintenance-mode state (`SystemSetting` value), then renders latest uptime cards plus a timeline of status snapshots.
  - Includes onboarding throughput (from `fetchPendingOnboardingActions`) so operators can correlate incidents with operational backlog.
- `/globaladmin/security` (`app/globaladmin/security/page.tsx`)
  - Aggregates admin activity, priority onboarding actions, `SystemSetting` records, access policies, security alerts, and hospital metadata.
  - Hosts compliance controls: MFA + data retention forms, `AccessPolicyPanel`, `SecurityAlertsPanel`, high-priority task list, and the shared `ActivityLog` with search/date filters plus a CSV export action. Each entry links to the dedicated audit detail page for deeper review.
- `/globaladmin/audit/[activityId]`
  - Detail view for a single `AdminActivity` record. Shows actor metadata, matched operator info, and pre-filtered email log export tools scoped to the event’s timestamp + recipient.
- `/globaladmin/settings` (`app/globaladmin/settings/page.tsx`)
  - Displays deployment metadata, trusted origins, and admin counts derived from Prisma queries.
  - Ships `IntegrationCreateForm`, `IntegrationList`, and `RolePolicyEditor` (with normalized permission arrays) so configuration changes stay in one pane.
- `/globaladmin/audit/[activityId]`
  - Detail page for a single `AdminActivity` entry. Shows actor metadata, matched operator info, and the decrypted notification (if any) tied to that event with a one-click download button scoped to that email log.

Every page wraps with `AdminPageTemplate`, `NoPhiBanner`, and `requireGlobalAdmin()` to guarantee RBAC enforcement before any data access.

### API routes (all require `requireGlobalAdminFromRequest`)

- `/api/globaladmin/analytics`
  - `GET` → Returns governance KPIs from `getAnalyticsSummary()`.
  - `/export` sub-route streams a CSV produced by `exportGovernanceReport()`.
- `/api/globaladmin/audit-logs`
  - `GET` → Returns the latest 100 `AdminActivity` entries; `/export` emits a 1,000-row CSV for compliance archiving.
- `/api/globaladmin/hospitals`
  - `GET` → Server map for every hospital (with counts and onboarding actions) used by dashboard + hospital directory.
  - `POST` → Creates hospitals via `createHospital()` with actor attribution.
  - `PATCH /[hospitalId]` → Either mutates metadata (`updateHospitalDetails`) or status (`changeHospitalStatus`).
- `/api/globaladmin/hospital-admins`
  - `GET` → Lists all hospital admins, including memberships for UI assignment chips.
  - `POST` → Creates admins through `createHospitalAdmin()` and returns the temporary password text that is emailed via `sendTemporaryPasswordEmail`.
  - `PATCH /[userId]` → Supports `reassign`, `status`, and `resetPassword` actions which call the corresponding helpers in `lib/services/global-admin/hospital-admins.ts`.
- `/api/globaladmin/onboarding`
  - `POST` → Adds custom onboarding tasks (`createCustomOnboardingAction`).
  - `PATCH /[actionId]` → Records decisions (approve/reject) and cascades to the linked hospital through `handleOnboardingDecision()`.
- `/api/globaladmin/access-policies`
  - `GET` → Fetches all `AccessPolicy` records.
  - `POST` → Drafts new policies via `createAccessPolicy()`; `PATCH /[policyId]` toggles between `approve` and `revoke` flows.
- `/api/globaladmin/role-policies`
  - `GET/PATCH` → CRUD interface for the `RolePolicy` table powering `RolePolicyEditor`.
- `/api/globaladmin/security/alerts`
  - `GET` → Surfaces alert history for the Security page.
  - `POST` → Raises alerts via `raiseSecurityAlert()` (kept non-PHI); `PATCH /[alertId]` marks alerts resolved and logs the actor in `AdminActivity`.
- `/api/globaladmin/email-logs/[logId]`
  - `GET` → Downloads the decrypted HTML for a single email log (RBAC enforced; server decrypts with `EMAIL_LOG_SECRET`) so reviewers can inspect only the notification tied to a specific activity entry.
- `/api/globaladmin/email-logs/export`
  - `GET` → Streams filtered, paginated `EmailLog` entries as an HTML file. On export, the server decrypts the AES-256-GCM ciphertext using `EMAIL_LOG_SECRET`, so only Global Admins can view content. Query params: `recipient`, `start`, `end`, `page`, `limit`.
- `/api/globaladmin/actors/[actorId]`
  - `GET` → Returns metadata (name, email, status, roles, hospitals) for a given user ID so reviewers can decode actors referenced in activity logs.
- `/api/globaladmin/system/settings`
  - `GET` → Dumps every `SystemSetting` row.
  - `PATCH` → Multiplexer for `maintenance_mode`, `mfa_policy`, `data_retention`, and any additional JSON-based settings through `upsertSystemSetting()`.
- `/api/globaladmin/system/integrations`
  - `GET` → Enumerates integration keys (last four digits, status, rotation timestamp).
  - `POST` → Creates a key, returning the plaintext token once; rotation + status transitions live on `PATCH /[integrationId]` (now updated to Next.js 16's `NextRequest` signature).

### Shared components & service layer adjustments

- `app/components/admin/activity-log.tsx` is now a client component with inline filters and a “View audit details” link that routes operators straight to `/globaladmin/audit/[activityId]`.
- `SystemControlsPanel`, `IntegrationList`, `IntegrationCreateForm`, `RolePolicyEditor`, `SecurityAlertsPanel`, `AdminCreateForm`, `AdminList`, `Hospital*` components, analytics components, and action confirmation utilities were all wired into the pages above; each submits via `fetch()` to the endpoints listed here so everything stays server-driven.
- Hospital operations gained client + server duplicate-prevention (contact email/phone) and reason-capture workflows. Status changes now require an inline justification, store that detail in the audit log (with appended email log references), and send templated emails to the hospital contact.
- Administrator provisioning enforces unique emails at the form level and automatically emails brand-aligned credentials using the HTML templates.
- All system emails are routed through `lib/email.ts`, which encrypts payloads with `EMAIL_LOG_SECRET`, logs every send to `EmailLog`, raises security alerts if SMTP transport/config is missing or delivery fails, and captures structured metadata (e.g., `emailLogId`) on each `AdminActivity` for machine-readable traceability.
- `/api/globaladmin/hospitals` now enforces DB-level uniqueness for `contactEmail`/`contactPhone` (with matching service-level normalization) to prevent racing writes from duplicating contact channels.
- `/api/globaladmin/email-logs/[logId]` + `/globaladmin/audit/[activityId]` help reviewers inspect/download only the email associated with a single action, while `/api/globaladmin/email-logs/export` supports broader, filtered compliance pulls when needed.
- Every admin page now mounts the floating `ActorLookupWidget` so reviewers can resolve actor IDs without leaving the context they are in.
- `lib/services/global-admin/system.ts` constrains `upsertSystemSetting` to `Prisma.InputJsonValue`, ensuring every persisted setting is strongly typed JSON. The helpers (`toggleMaintenanceMode`, `configureMfaPolicy`, `updateDataRetention`, integration key helpers, policy helpers) share that return path.
- `app/api/globaladmin/system/integrations/[integrationId]/route.ts` switched to `{ params: Promise<{ integrationId: string }> }` + `NextRequest`, matching Next.js 16 expectations and unblocking builds.
- `lib/email.ts` can now leverage full type coverage because `@types/nodemailer` was added to `devDependencies`.

Collectively these updates give product, security, and ops teammates an auditable, PHI-free cockpit with clearly delineated server APIs and UI entry points.
- **Access policy approvals**, MFA toggles, and data retention updates all emit audit events for traceability.

### Operational recommendations

- **CSRF / server actions:** Today all mutations run behind authenticated server components, but if the console ever spans multiple origins, enable CSRF tokens or migrate critical workflows to server actions.
- **Structured metadata everywhere:** We encode `emailLogId` inside `AdminActivity.metadata`; extend the same pattern to other event types (policy approvals, security changes) so nothing relies on parsing the `action` string.
- **Alert routing:** `EMAIL_DELIVERY_FAILURE` events are stored in `SecurityAlert`. Wire those to your paging/on-call tooling so missing migrations/SMTP outages trigger real-time responses.
- **Migrations before deploy:** Always run `npx prisma migrate deploy` (or `prisma migrate dev`) in every environment before starting the app. The code now warns and emits alerts if tables are missing, but proactive migrations prevent service-impacting gaps.
- **Template sanitization:** Email templates are server-authored, but if you ever embed user-generated snippets, sanitize before rendering—especially in the audit detail page that uses `dangerouslySetInnerHTML`.

## Developer onboarding checklist

1. **Bootstrap environment**
   - Install dependencies: `npm install`.
   - Copy `.env.example` → `.env`, set `BETTER_AUTH_SECRET`, `AUTH_SECRET`, `EMAIL_LOG_SECRET`, `DATABASE_URL`, SMTP credentials.
   - Optional: build/run Postgres via `Dockerfile.db` for local usage.

2. **Database & Prisma**
   - Run migrations locally: `npx prisma migrate dev`.
   - Seed demo data: `npx prisma db seed` (creates sample hospitals, admins, activities, security alerts).
   - Generate Prisma client after schema edits: `npx prisma generate`.

3. **Run the app**
   - `npm run dev` starts Next.js 16 with server components + Better Auth.
   - Sign in at `/login` with seeded credentials, then explore `/globaladmin/*`.

4. **Key modules to know**
   - `lib/services/global-admin/*`: pure business logic powering all APIs.
   - `app/api/globaladmin/*`: HTTP entrypoints; always guard with `requireGlobalAdminFromRequest`.
   - `lib/email.ts` + `email-templates.ts`: SMTP delivery, AES-256-GCM encryption, logging, alerting.
   - `lib/rate-limit.ts`: reusable helper for throttling sensitive endpoints.
   - `app/components/admin/*`: shared UI primitives; prefer server components, mark `"use client"` only when necessary.

5. **When adding features**
   - Record every privileged action via `recordAdminActivity`, supplying structured `metadata` (IDs, context objects).
   - If sending emails, always go through `sendSystemEmail` to inherit encryption/logging/alerting.
   - Update Prisma schema + migrations when new tables/fields are needed; run `prisma migrate` before pushing.
   - Document new env vars, migrations, or operational procedures in this README.

6. **Security hygiene**
   - Monitor and route `EMAIL_DELIVERY_FAILURE` security alerts to on-call.
   - Enforce `prisma migrate deploy` in CI/CD before `next start`.
   - If the console becomes multi-origin, add CSRF tokens or migrate high-risk flows to server actions.
   - Sanitize any future user-generated email snippets before rendering (`dangerouslySetInnerHTML`).

### Analytics & oversight

- **Platform analytics summary** aggregates Prisma data via `lib/services/global-admin/analytics.ts` and renders on the dashboard plus `/api/globaladmin/analytics`.
- **Governance/export reports** produced by `/api/globaladmin/analytics/export` (CSV) and surfaced through `AnalyticsExportButton`.
- **Usage metrics** rely on grouped Prisma queries (hospital status, onboarding queue, activity categories) so nothing sensitive is exposed.

### Scalability, security, and editability

- **Services-first architecture:** Business logic lives in `lib/services/global-admin/*`, so API routes and server components stay small and maintainable.
- **Modular UI library:** Interactive pieces reside under `components/admin/**`, meaning pages compose small client/server components without bloating files.
- **Strict RBAC guards:** All pages and routes call `requireGlobalAdmin` (or `requireGlobalAdminFromRequest`) before touching data, guaranteeing policy enforcement.
- **Database-backed policies:** New enums/models (`HospitalStatus`, `SystemSetting`, `IntegrationKey`, `AccessPolicy`, `SecurityAlert`, `RolePolicy`) anchor every capability with auditable state.
- **Non-PHI guarantee:** Every query targets governance tables only; banner copy and README warnings reiterate the restriction to prevent future regressions.

## Core Governance Data Model

Prisma models now capture the minimal governance structure needed across facilities:

- `User` – uniquely identified by email and serves as the anchor for assignments, sessions, and credentials.
- `Role` – unique name per role; seeded with GlobalAdmin, HospitalAdmin, Doctor, Nurse, Pharmacist, LabTech, Registrar, Billing, Receptionist, and CareCoordinator for consistent permission bundles.
- `UserRole` – join table that enforces unique user/role combinations across the entire platform.
- `Hospital` – unique name per facility; later you can attach metadata (address, regulatory IDs, capacity).
- `HospitalUser` – connects users to hospitals with unique membership constraints, letting a clinician belong to multiple facilities safely.
- `Account` – stores credential information per identity provider (email/password today, social/OAuth tomorrow) and links back to `User`.
- `Session` – tracks active Better Auth sessions for “remember me” and auditing.
- `Verification` – holds short-lived tokens for email verification and password reset flows.
- `RateLimit` – records request counts/last access timestamps for anti-abuse throttling of auth endpoints.

The schema lives at `prisma/schema.prisma`, and the first migration (`20251114214830_init_core_identity`) creates the tables, indexes, and cascading foreign keys above.

### How the models interact in real flows

| Model | Primary job | Used when |
| --- | --- | --- |
| `User` | Canonical identity (name, email, timestamps) | Every server component/API that needs to know “who is this person?” |
| `Role` | Global permission bundle definition | Admin tooling that manages governance capabilities |
| `UserRole` | Assigns global roles to users (one per user/role pair) | Authorization checks for dashboards, admin experiences, or global actions |
| `Hospital` | One facility/organization entry | Scheduling, EMR, or operations views scoped to a location |
| `HospitalUser` | Membership of a user in a specific hospital | Determining if a user should access a hospital’s patients, inventory, etc. |
| `Account` | Credential store per provider + password hash | Better Auth email/password login, future OAuth providers |
| `Session` | Tracks issued login sessions and metadata | Better Auth session validation via middleware + logout handling |
| `Verification` | Stores verification/reset tokens | Email verification, password reset, and other token-based flows |
| `RateLimit` | Counters and timestamps for throttling | Better Auth’s anti-brute-force protections |

When a user signs in:
1. `Account` provides the hashed password for verification.
2. On success, Better Auth writes a `Session` row and issues cookies.
3. Server components or route handlers call `auth.api.getSession({ headers: await headers() })` to resolve the signed-in `User`.
4. You can join `UserRole` or `HospitalUser` (plus `Role` / `Hospital`) to scope data or enforce authorization.
5. Rate-limiting data accrues in `RateLimit`, and verification flows (e.g., password reset) temporarily populate `Verification`.

## Database Helper & Seeding

- Instantiate Prisma via `lib/db.ts`, which imports the generated client from `generated/prisma`. Use this helper anywhere server-side access is required.
- `prisma/seed.ts` upserts the base role catalog to keep the seed run idempotent.
- The Prisma config (`prisma.config.ts`) points migrations to `prisma/migrations/` and wires the seed command to `tsx prisma/seed.ts`, so every `prisma migrate reset` or `prisma db seed` run shares the same entrypoint.

### Running migrations & seeds locally

After configuring `DATABASE_URL` (see next section) run:

```bash
npx prisma migrate dev --name init_core_identity
npx prisma db seed
```

The migration command generates/updates the client automatically; the seed command replays the base roles and can be repeated safely.

## Database Container

A `Dockerfile.db` is provided to spin up a local PostgreSQL instance for the United National Health application. Build and run it with:

```bash
docker build -f Dockerfile.db -t unh-db .
docker run --name unh-db -p 5433:5432 \
  -e POSTGRES_USER=unh_app \
  -e POSTGRES_PASSWORD=unh_local_password \
  -e POSTGRES_DB=united_national_health \
  unh-db
```

If you already have a container called `unh-db`, remove or rename it before rerunning the command, e.g.:

```bash
docker stop unh-db && docker rm unh-db
# or choose a different container name: docker run --name unh-db-dev ...
```

Override the env vars above as needed for your environment. Prisma manages the schema and seed data, so after the database container is running point your `DATABASE_URL` to `postgres://unh_app:unh_local_password@localhost:5433/united_national_health` (or whatever you configure) and run your Prisma workflows, e.g. `npx prisma migrate deploy` or `npx prisma db seed`.

Example `.env` entry:

```
DATABASE_URL=postgresql://unh_app:unh_local_password@localhost:5433/united_national_health?schema=public
```

Once the connection string is in place, run the standard Prisma workflow (migrate + seed) whenever you need to hydrate the governance data:

```
npx prisma migrate deploy
npx prisma db seed
```

## Authentication flow

Better Auth powers the login stack so you can authenticate users and get their `userId` in API routes and server components.

- `lib/auth.ts` bootstraps Better Auth with the Prisma adapter (PostgreSQL), enables email/password auth, and installs the `nextCookies()` plugin so server actions can set cookies automatically.
- `lib/auth-client.ts` wraps `createAuthClient()` from `better-auth/react`, letting client components call actions such as `signInEmail` with automatic cookie handling.
- `app/api/auth/[...better-auth]/route.ts` simply exports `{ GET, POST } = toNextJsHandler(auth.handler)` as recommended in the docs so the auth router is mounted under `/api/auth/*`.
- `app/login/page.tsx` is a lightweight credential form that calls `authClient.signInEmail()` and then redirects the user (admins are detected by hitting `/api/session` for role metadata).
- `app/logout/page.tsx` signs out by calling `auth.api.signOut()` inside a server component and then redirects to `/login`.
- `middleware.ts` guards `/admin`, `/hospital`, and `/clinical` using Better Auth's `getSessionCookie` helper (only redirects if no cookie is set; each protected page still validates the session itself).
- `app/admin/page.tsx` shows how to call `auth.api.getSession({ headers: await headers() })` inside an RSC before rendering anything sensitive.
- `prisma/seed.ts` also provisions a default Global Admin account so you can test the UI immediately after running `npx prisma db seed`.

### Environment variables

The following keys are required for Better Auth:

```
BETTER_AUTH_SECRET=...
AUTH_SECRET=...                # optional fallback, keep in sync with BETTER_AUTH_SECRET
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
BETTER_AUTH_APP_NAME=United National Health
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000
SEED_ADMIN_EMAIL=admin@unh.local
SEED_ADMIN_PASSWORD=ChangeMeNow!123
SEED_ADMIN_NAME=System Administrator
SMTP_HOST=smtp.postmarkapp.com
SMTP_PORT=587
SMTP_USER=postmark-api-user
SMTP_PASS=postmark-api-key
SMTP_FROM="United National Health <governance@unh.gov>"
SMTP_SECURE=false
EMAIL_LOG_SECRET=base64-encoded-32-byte-secret
```

Use unique values per environment. `BETTER_AUTH_SECRET`/`AUTH_SECRET` must be strong cryptographic strings (generate via `openssl rand -base64 32`). `EMAIL_LOG_SECRET` is recommended but, if omitted, the system will fall back to `BETTER_AUTH_SECRET` so logs remain encrypted (still rotate it regularly). `BETTER_AUTH_URL` as well as the trusted origins should point to the host serving `/api/auth`.

> **Database migrations:** recent features (email logging, duplicate-prevention, etc.) require the new migrations in `prisma/migrations/20251118120000_add_email_log`. Always run `npx prisma migrate deploy` (or `prisma migrate dev` locally) after pulling to ensure the `EmailLog` table and hospital contact uniqueness constraints exist before resetting passwords or sending other notifications.

> **Local admin credentials:** By default the seed script creates `admin@unh.local` / `ChangeMeNow!123`. Override `SEED_ADMIN_*` before re-running the seed command to change or rotate these credentials, and never reuse the defaults outside local development.

## Hospital Admin Operational Surface

The `/hospitaladmin` module is a scoped, PHI-free operations suite for facility administrators. It brings full staff lifecycle tooling, department/resource controls, analytics, inventory management, and aggressive auditing—every mutation stays scoped to the admin’s hospital and mirrored to governance logs.

### Authentication & Session Flow
- `lib/require-hospital-admin.ts` validates the Better Auth session and ensures the signed-in user holds the `HospitalAdmin` role before any server component or API handler executes.
- First-time admins must pass through `HospitalAdminVerification`, which fetches CSRF tokens from `/api/hospital-admin/csrf`, refreshes them every four minutes, enforces the password policy, rate-limits submissions, and exposes a logout button for immediate sign-out.
- The shared `LogoutButton` component now adorns both the verification view and the authenticated shell, guaranteeing logout coverage across the hospital admin UI.

### Staff Lifecycle & Auditing
- Staff creation is limited to the operational roles Doctor, Nurse, Lab Technician, Billing, Receptionist, Care Coordinator, Pharmacist, and Administrator. The Prisma enum, Zod schema, and dropdown share this exact set.
- Doctor-specific metadata (department, specialization, license number, level) is conditionally rendered—and required—only when the Doctor role is selected. Other roles skip those fields entirely.
- Doctors cannot be created unless an active department exists inside the admin’s hospital. Departments enforce a configurable capacity ceiling (`DEPARTMENT_CAPACITY_LIMIT`, default 50 active assignments) before allowing new staff assignments, and doctor onboarding auto-creates the corresponding staff assignment row.
- Staff provisioning spins up the user, credential, hospital membership, staff profile, and user-role mapping. Temporary passwords are generated server-side, hashed, emailed via `sendTemporaryPasswordEmail`, and logged (encrypted) in `EmailLog`.
- Staff detail pages expose Activate, Mark on Leave, Disable, and Reset Credentials buttons. Credential resets regenerate a password, email the staffer, set `emailVerified=false`, log hospital/global audit entries, raise security alerts, and are rate-limited (three per hour per staff member).
- Status changes (activate/disable) email the staff member (`sendStaffStatusEmail`), capture `AuditLog` entries, mirror to `AdminActivity`, and raise severity-tuned alerts to keep the security team informed.

### Departments, Rooms, Scheduling, Inventory
- Department assignments require an active department belonging to the same hospital and respecting the capacity limit. Soft-deleting departments nulls head references and logs the event.
- Rooms and equipment use scoped Prisma queries with audit logging; equipment entries must reference existing rooms or remain unassigned.
- Scheduling posts through server actions, includes a per-admin rate limit (20/minute), and logs every change. `/api/hospital-admin/schedule/[scheduleId]` supports GET/PATCH/DELETE with promise-based params to satisfy Next.js 16.
- `/hospitaladmin/analytics` now renders inventory rows with inline minus/plus buttons. Each posts to `adjustInventoryQuantityAction`, clamping values above zero while intentionally skipping audit logs per the operational requirement.

### Analytics & Reporting
- `getHospitalAnalyticsSnapshot` aggregates staff counts for every approved role (including billing/receptionist/care coordinator), department utilization, room usage, shift coverage, and patient flow. The analytics page renders fixed cards for each role so counts are never hidden.
- `/api/hospital-admin/analytics/export` streams CSV or PDF (via `pdf-lib`) that summarize staff distribution, room metrics, upcoming surgeries, and inventory alerts.

### Rate Limiting, Alerts, Logging
- Sensitive actions call `enforceRateLimit`: credential resets (3/hour/staff) and schedule creation (20/minute/admin) return user-friendly errors when exceeded, and reset abuse raises a `STAFF_RESET_RATE_LIMIT` alert.
- `raiseSecurityAlert` records status flips, credential resets, and rate-limit violations so the global security team can respond immediately.
- `logHospitalAudit` stores `Prisma.InputJsonValue` payloads, capturing hospital/actor/resource metadata plus optional JSON changes. `recordAdminActivity` mirrors high-sensitivity events, ensuring governance teams can trace every hospital-level action.

### API Compliance & Utilities
- All `/api/hospital-admin/*` handlers resolve `context.params` and `searchParams` as Promises per Next.js 16’s validator.
- `/api/hospital-admin/csrf` is the only endpoint allowed to mutate CSRF cookies, complying with Next.js 13+ cookie rules.
- Notifications (credential setup, status changes) run through `sendSystemEmail`, which encrypts payloads before logging and raises alerts on SMTP failures.

Collectively these features give hospital administrators a secure, audited operational toolkit while keeping data scoped to their facility and invisible to unauthorized actors.
