# Architecture

## Stack

- **Framework**: Next.js (App Router), TypeScript strict mode.
- **Styling**: Tailwind CSS v4 + shadcn/ui (Radix-based) components.
- **Icons**: Lucide React.
- **Database**: MySQL (Hostinger-hosted), accessed via Prisma ORM.
- **Auth**: custom, self-hosted — see "Why not Auth.js" below.
- **File storage**: local disk on the server, outside the public web root,
  served only through authenticated route handlers.
- **Forms/validation**: React Hook Form + Zod.
- **Charts**: Recharts, used sparingly (dashboard trend/status breakdowns only).
- **Deployment target**: Hostinger shared/Business hosting via cPanel's
  "Setup Node.js App" (Phusion Passenger).

## Why not Supabase / why not Auth.js

The original spec assumed Supabase (Postgres + Auth + Storage + Row-Level
Security). The user's actual hosting is Hostinger shared hosting with MySQL,
which changes two load-bearing assumptions:

1. **No Postgres RLS.** MySQL has no equivalent. Every authorization rule
   that would have been a database policy is now enforced in application
   code — see `lib/permissions/` and `docs/permissions.md`. This is a real
   reduction in defense-in-depth (a bug in a server action is no longer
   caught by a second database-level check) and is called out explicitly in
   `docs/security.md`.

2. **Auth.js (NextAuth)'s Credentials provider does not support database
   session strategy** in a first-class way — it's built around JWT sessions
   for credentials logins. The spec requires that deactivating a user
   revoke access immediately, not "whenever their JWT happens to expire."
   Rather than fight that limitation with unofficial workarounds, this
   project uses a small, auditable custom session system:
   - Passwords hashed with bcrypt (`bcryptjs`, pure JS — avoids native
     binary compile issues on shared hosting).
   - On login, a random 32-byte token is generated; only its SHA-256 hash is
     stored in the `sessions` table; the raw token is set as an httpOnly,
     secure, `SameSite=Lax` cookie.
   - Every request re-validates the session by looking up the hash, joining
     the user, and checking both `expiresAt` and `user.status === ACTIVE`.
   - Deactivation deletes all of a user's `Session` rows in the same
     transaction that flips their status, so access ends on their very next
     request.

   This is simple enough to read end-to-end and test directly (see
   `tests/auth`), which matters more here than adopting a library whose
   happy path doesn't fit this requirement.

## Deployment model (Hostinger cPanel)

- Build with `output: "standalone"` (`next.config.ts`) so the production
  artifact is a self-contained `.next/standalone/server.js` that Passenger
  can run directly.
- cPanel's Node.js Selector sets `NODE_ENV=production` and proxies requests
  to the app's port; the app itself doesn't need its own HTTP-to-HTTPS logic
  (cPanel/AutoSSL terminates TLS).
- No persistent background workers: there is no queue, no cron-in-process.
  Scheduled jobs (backups, overdue-task sweeps for notifications) run via
  cPanel's **Cron Jobs** feature calling a small CLI script, not a Node
  daemon — see `docs/backup-recovery.md`.
- Known risk: any dependency with a native binary (compiled per
  OS/architecture) can fail to run on Hostinger's exact Node build. This
  project avoids such dependencies where a pure-JS alternative exists
  (`bcryptjs` instead of `bcrypt`). Prisma's query engine is itself a native
  binary bundled per-platform; `prisma generate` must be run with a target
  matching the hosting environment before deploying — see
  `docs/deployment.md`.

## Folder structure

```
app/                  Routes (App Router). Route groups separate concerns:
  (public)/           Public marketing pages + public Media Gallery — no auth.
  (app)/              Authenticated application shell (sidebar nav, etc).
  api/                Route handlers (file downloads, webhooks if any).
components/           Reusable, mostly presentational UI components (shadcn/ui lives here too).
features/             Domain modules: projects/ activities/ tasks/ meetings/ archive/ gallery/ team/ reports/ audit/
  <feature>/
    actions.ts         Server actions (the only place that calls Prisma for this feature)
    queries.ts          Read-side data access
    schema.ts           Zod schemas for this feature's forms
    components/         Feature-specific UI
lib/
  db/                 Prisma client singleton
  auth/               Session creation/validation, password hashing
  permissions/         can(user, action, resource) helpers — single source of truth
  storage/             Safe path generation, upload validation, file streaming
  validation/           Cross-feature Zod helpers
  reports/              CSV/PDF generation utilities
types/                 Shared TypeScript types
prisma/
  schema.prisma
  migrations/
tests/                 Unit + integration + authorization tests
e2e/                   End-to-end tests
docs/                  This documentation set
```

## Data access rule

All Prisma calls live in `features/<name>/actions.ts` or `queries.ts` —
never directly inside a React Server Component or a client component. This
keeps every authorization check (`lib/permissions`) on a single required
path, so a reviewer can audit "does every write path check permissions?" by
reading one directory per feature instead of grepping the whole app.
