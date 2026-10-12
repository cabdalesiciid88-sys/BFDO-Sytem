# Project Status

Living checklist. Update this file as work completes — this is the single
place to check "is X actually done" rather than trusting chat history.

Last updated: 2026-10-12.

## Phase 1 is complete

Scaffold, schema, folder structure, and core docs are done; lint, typecheck,
and `next build` (standalone output) all pass cleanly on the bare app. See
below for detail and for what's still blocked.

## Platform decision record

- Hosting: **Hostinger shared/Business hosting (cPanel, Phusion Passenger)**,
  not Vercel/Supabase as originally drafted.
- Database: **MySQL** via Prisma ORM, not Postgres/Supabase. No Row-Level
  Security — authorization is enforced entirely in application code
  (`lib/permissions/`). See `docs/permissions.md` and `docs/security.md`.
- Auth: custom session system (bcrypt + hashed session tokens in MySQL),
  not Auth.js/Supabase Auth — see `docs/architecture.md` for why.
- File storage: local disk on the server, not Supabase Storage/S3.
- Media scope v1: **images and documents only**. Video fields exist in the
  schema but upload UI/storage ships later (cost/complexity control, per
  explicit user decision).

## Phase 1 — Repository & architecture

- [x] Inspect environment (Node 24, npm 11, Git 2.54 confirmed available).
- [x] Scaffold Next.js (App Router, TypeScript strict, Tailwind v4, ESLint).
- [x] `next.config.ts` set to `output: "standalone"` for cPanel/Passenger.
- [x] Prisma installed, pinned to a matched stable CLI+client pair (7.10.0 —
      npm's "latest" tag pointed at an 8.0 release candidate; pinned to the
      last fully stable release instead).
- [x] Prisma 7 connection model: connection strings no longer live in
      `schema.prisma` — `prisma.config.ts` holds the URL for CLI/migrate
      commands, and the running app builds a `@prisma/adapter-mariadb`
      driver adapter from `DATABASE_URL` at runtime (`lib/db/client.ts`).
      This driver works against both MariaDB and vanilla MySQL.
- [x] Full database schema drafted (`prisma/schema.prisma`) — 20 models
      covering identity/auth, projects, activities, tasks, meetings,
      decisions, reports, digital archive, public gallery approvals, audit
      logs, notifications.
- [x] `docs/database-schema.md`, `docs/permissions.md` (permission matrix),
      `docs/architecture.md`, `docs/security.md` written.
- [x] shadcn/ui + Lucide + React Hook Form + Zod installed and wired
      (note: this shadcn CLI generation did not include a `form.tsx`
      wrapper component for this registry style — forms will be built
      directly with `react-hook-form` + `zodResolver` + the installed
      primitives rather than depending on that wrapper).
- [x] Folder structure in place (`features/`, `types/`, `tests/`, `e2e/`,
      `lib/{db,auth,permissions,storage,validation,reports}/`).
- [x] `npm run lint`, `npx tsc --noEmit`, and `npm run build` all pass
      cleanly on the bare scaffold (confirms `output: "standalone"` +
      Prisma 7 driver-adapter setup actually works end to end).
- [ ] First migration applied against a real MySQL database — **blocked**:
      no `DATABASE_URL` configured yet (no MySQL database has been created
      on Hostinger, or credentials haven't been shared). See "Blockers"
      below. Schema is fully drafted and ready to apply the moment a
      connection string is available.

## Phase 2 — Authentication & permissions

- [ ] Custom session auth (signup is admin-only; no public self-registration
      per spec — accounts are created/invited by an admin).
- [ ] `lib/permissions` authorization helpers + tests.
- [ ] Protected route layout (`app/(app)/layout.tsx`) redirecting
      unauthenticated/deactivated users.
- [ ] First-administrator bootstrap script (`npm run create-admin`).

## Phase 3 — Core organizational modules

- [ ] Dashboard (real metrics, permission-aware).
- [ ] Project management (CRUD, search/filter, status, archiving).
- [ ] Activity Register (CRUD, search/filter, timeline).
- [ ] Tasks module.
- [ ] Meetings & Decisions module.
- [ ] Team management (admin).

## Phase 4 — Digital Archive & Public Gallery

- [ ] Private local-disk storage + safe path generation.
- [ ] Upload validation (type/size, server-side, not extension-trusting).
- [ ] Thumbnail generation for images.
- [ ] Archive browse/search UI.
- [ ] Public gallery + approval/revocation workflow.

## Phase 5 — Reporting & administration

- [ ] Reports (activities by date/project/category, task status, archive
      uploads, gallery approvals).
- [ ] CSV export, enforcing the same permission checks as the source data.
- [ ] Audit logging wired into every sensitive action.
- [ ] System settings page.

## Phase 6 — Reliability & deployment

- [ ] Unit/integration/authorization/E2E tests.
- [ ] Backup & recovery procedure documented and actually tested.
- [ ] `docs/deployment.md`, `docs/security.md`, `docs/user-guide.md`,
      `docs/backup-recovery.md` completed.
- [ ] Lint, typecheck, build all passing.
- [ ] Final readiness review against the spec's Definition of Done.

## Blockers / things only the user can provide

1. **A MySQL database to connect to.** Either:
   - create one now in Hostinger's hPanel (MySQL Databases section) and
     share the resulting `DATABASE_URL` pieces (host, port, db name, user,
     password) via a local `.env` file (never paste the password in chat),
     or
   - confirm you want local development against a MySQL instance running
     on this machine first (e.g. via XAMPP/local MySQL), with production
     credentials added later.
2. **Confirm Node.js version available in Hostinger's cPanel "Setup Node.js
   App"** — this determines whether Next.js 16 / Prisma 7 will run as-is on
   the production server (both expect a reasonably current Node 20+/22+
   runtime). If Hostinger's selector tops out lower, some dependencies may
   need downgrading before deployment.
3. **Email sending** (for invitations and password reset) needs SMTP
   credentials (Hostinger's own mailbox SMTP, or a transactional provider).
   Without these, invite/reset links will be generated and visible to an
   admin but not auto-emailed.

None of these block continued development — Phase 1 structure, schema, and
Phase 2+ feature code can all proceed against a local or placeholder MySQL
instance and be pointed at the real one later.
