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

- `User` – uniquely identified by email + name and serves as the anchor for assignments.
- `Role` – unique name per role; seeded with GlobalAdmin, HospitalAdmin, Doctor, Nurse, Pharmacist, LabTech, Registrar, Billing, Receptionist, and CareCoordinator.
- `UserRole` – join table that enforces unique user/role combinations.
- `Hospital` – unique name per facility.
- `HospitalUser` – connects users to hospitals with unique membership constraints.

The schema lives at `prisma/schema.prisma`, and the first migration (`20251114214830_init_core_identity`) creates the tables, indexes, and cascading foreign keys above.

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
