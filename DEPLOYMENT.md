# Live Submission Deployment Guide

This project runs locally with SQLite for easy development. For a public live submission, use PostgreSQL because serverless hosts such as Vercel do not persist a local SQLite file reliably.

## 1. Create a hosted PostgreSQL database

Use one of these:

- Vercel Postgres / Vercel Marketplace database
- Neon PostgreSQL
- Supabase PostgreSQL
- Prisma Postgres

Copy the database connection string. It will look like this shape:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
```

Use your real provider string. Do not commit it to GitHub.

## 2. Switch Prisma to PostgreSQL before deploying

Open `prisma/schema.prisma` and change:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

to:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then reset migrations for the production database provider:

```bash
rm -rf prisma/migrations
npx prisma migrate dev --name init_postgres
npx prisma generate
```

## 3. Test locally against hosted PostgreSQL

Set `.env`:

```env
DATABASE_URL="your_real_postgres_connection_string"
```

Then run:

```bash
npx prisma migrate deploy
npm run prisma:seed
npm run dev
```

Open `http://localhost:3000` and test all three journeys.

## 4. Push to GitHub

```bash
git init
git add .
git commit -m "Build AtomQuest goal setting portal"
git branch -M main
git remote add origin YOUR_REAL_GITHUB_REPO_URL
git push -u origin main
```

## 5. Deploy on Vercel

Import the GitHub repository into Vercel.

Add this environment variable in Vercel:

```txt
DATABASE_URL = your_real_postgres_connection_string
```

Build command:

```bash
npm run build
```

After deployment, if the database is empty, run locally:

```bash
npx prisma migrate deploy
npm run prisma:seed
```

Then redeploy or refresh the Vercel URL.

## 6. Submission bundle

Prepare:

1. Live demo URL
2. GitHub repository URL
3. Architecture diagram PDF/PNG
4. Demo credentials
5. Short README/demo guide

Demo credentials:

```txt
Employee: employee@demo.com / Demo1234
Manager:  manager@demo.com / Demo1234
Admin:    admin@demo.com / Demo1234
```
