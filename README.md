This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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
```

Use unique values per environment. `BETTER_AUTH_SECRET`/`AUTH_SECRET` must be strong cryptographic strings (generate via `openssl rand -base64 32`). `BETTER_AUTH_URL` as well as the trusted origins should point to the host serving `/api/auth`.

> **Local admin credentials:** By default the seed script creates `admin@unh.local` / `ChangeMeNow!123`. Override `SEED_ADMIN_*` before re-running the seed command to change or rotate these credentials, and never reuse the defaults outside local development.
