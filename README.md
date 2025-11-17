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
  - Hosts compliance controls: MFA + data retention forms, `AccessPolicyPanel`, `SecurityAlertsPanel`, high-priority task list, and the shared `ActivityLog` (complete with download button via `ActivityExportButton`).
- `/globaladmin/settings` (`app/globaladmin/settings/page.tsx`)
  - Displays deployment metadata, trusted origins, and admin counts derived from Prisma queries.
  - Ships `IntegrationCreateForm`, `IntegrationList`, and `RolePolicyEditor` (with normalized permission arrays) so configuration changes stay in one pane.

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
- `/api/globaladmin/system/settings`
  - `GET` → Dumps every `SystemSetting` row.
  - `PATCH` → Multiplexer for `maintenance_mode`, `mfa_policy`, `data_retention`, and any additional JSON-based settings through `upsertSystemSetting()`.
- `/api/globaladmin/system/integrations`
  - `GET` → Enumerates integration keys (last four digits, status, rotation timestamp).
  - `POST` → Creates a key, returning the plaintext token once; rotation + status transitions live on `PATCH /[integrationId]` (now updated to Next.js 16's `NextRequest` signature).

### Shared components & service layer adjustments

- `app/components/admin/activity-log.tsx` now imports `next/link` and renders an inline “View audit details” link that routes operators straight to `/globaladmin/security?log={AdminActivity.id}` for context.
- `SystemControlsPanel`, `IntegrationList`, `IntegrationCreateForm`, `RolePolicyEditor`, `SecurityAlertsPanel`, `AdminCreateForm`, `AdminList`, `Hospital*` components, analytics components, and action confirmation utilities were all wired into the pages above; each submits via `fetch()` to the endpoints listed here so everything stays server-driven.
- `lib/services/global-admin/system.ts` constrains `upsertSystemSetting` to `Prisma.InputJsonValue`, ensuring every persisted setting is strongly typed JSON. The helpers (`toggleMaintenanceMode`, `configureMfaPolicy`, `updateDataRetention`, integration key helpers, policy helpers) share that return path.
- `app/api/globaladmin/system/integrations/[integrationId]/route.ts` switched to `{ params: Promise<{ integrationId: string }> }` + `NextRequest`, matching Next.js 16 expectations and unblocking builds.
- `lib/email.ts` can now leverage full type coverage because `@types/nodemailer` was added to `devDependencies`.

Collectively these updates give product, security, and ops teammates an auditable, PHI-free cockpit with clearly delineated server APIs and UI entry points.
- **Access policy approvals**, MFA toggles, and data retention updates all emit audit events for traceability.

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
```

Use unique values per environment. `BETTER_AUTH_SECRET`/`AUTH_SECRET` must be strong cryptographic strings (generate via `openssl rand -base64 32`). `BETTER_AUTH_URL` as well as the trusted origins should point to the host serving `/api/auth`.

> **Local admin credentials:** By default the seed script creates `admin@unh.local` / `ChangeMeNow!123`. Override `SEED_ADMIN_*` before re-running the seed command to change or rotate these credentials, and never reuse the defaults outside local development.
