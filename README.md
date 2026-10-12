# BFDO Management System

A centralized web application for BFDO to manage projects, activities, the
digital archive (photos/documents), tasks, meetings, team members, and
reporting — plus a public media gallery for approved content.

**Status**: early build-out. See `docs/project-status.md` for exactly what
is implemented versus still pending, and what's blocked on credentials only
you can provide.

## Stack

Next.js (App Router, TypeScript strict) · Tailwind CSS + shadcn/ui · MySQL
via Prisma ORM · custom session-based auth (bcrypt) · local-disk private
file storage · React Hook Form + Zod · Recharts.

This differs from a "default" Supabase/Postgres stack because the target
host is Hostinger shared hosting with MySQL. See `docs/architecture.md` for
the reasoning, in particular "Why not Supabase / why not Auth.js".

## Getting started (local development)

1. Install dependencies:
   ```
   npm install
   ```
2. Create a MySQL database (locally, e.g. via XAMPP/MySQL Workbench, or a
   Hostinger-hosted one reachable from your machine).
3. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and the other
   values (see comments in that file for what each one is for).
4. Apply the schema:
   ```
   npx prisma migrate dev
   ```
5. Create the first System Administrator account:
   ```
   npm run create-admin
   ```
   (script added in Phase 2 — see `docs/project-status.md`)
6. Run the dev server:
   ```
   npm run dev
   ```

## Documentation

- `docs/architecture.md` — system architecture and key decisions.
- `docs/database-schema.md` — tables and relationships, in plain language.
- `docs/permissions.md` — roles, permission matrix, and the hard rules every
  server action must respect.
- `docs/project-status.md` — what's done, what's pending, what's blocked.
- `docs/deployment.md`, `docs/backup-recovery.md`, `docs/security.md`,
  `docs/user-guide.md` — added as those phases complete.

## Project structure

See `docs/architecture.md#folder-structure`.
