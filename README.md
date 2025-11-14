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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

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
