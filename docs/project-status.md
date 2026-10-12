# Project Status

Living checklist. Update this file as work completes — this is the single
place to check "is X actually done" rather than trusting chat history.

Last updated: 2026-10-12.

## Phases 1 & 2 are complete

Scaffold, schema, folder structure, core docs, and now real working
authentication (login/logout/protected routes/role+project permission
helpers) are done — verified both by `lint`/`tsc`/`next build` and by
actually using it in a browser against a real local MySQL database. See
below for detail and for what's still blocked. **Next session starts on
Phase 3** (dashboard metrics, Projects, Activity Register, Tasks,
Meetings & Decisions, Team management) — see the Phase 3 checklist below.

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
- [x] Initial migration applied — against a **local development** MySQL 8.4
      instance running in Docker (container `bfdo-mysql-dev`, mapped to host
      port **3307**, not 3306 — this machine already runs an unrelated
      project's MySQL container on 3306, so 3307 avoids any conflict). All
      20 tables created and verified. Production migration against the real
      Hostinger database is still pending real credentials — see
      "Blockers" below.

## Phase 2 — Authentication & permissions (complete)

- [x] Custom session auth: bcrypt password hashing (`lib/auth/password.ts`),
      random-token sessions hashed with SHA-256 in MySQL
      (`lib/auth/session.ts`), httpOnly/secure/SameSite=Lax cookie. No public
      self-registration — accounts are admin-created only (enforced simply
      by there being no sign-up route).
- [x] Login/logout server actions (`features/auth/actions.ts`) with generic
      "invalid email or password" errors (no account-enumeration leak) and
      a simple in-memory rate limiter on login (`lib/auth/rate-limit.ts`).
- [x] `lib/permissions`: role-based capability sets (`roles.ts`),
      project-membership checks with org-wide bypass for Admin/Leadership
      (`project-access.ts`), and a `ForbiddenError` convention for the
      route layer to turn into `notFound()`.
- [x] `lib/audit/log.ts` — the one and only way anything writes to
      `audit_logs` (append-only by construction). Full audit event wiring
      happens feature-by-feature starting Phase 3/5.
- [x] Protected route layout (`app/(app)/layout.tsx`) — calls
      `requireUser()`, which redirects to `/login` for anyone without a
      valid, non-expired, ACTIVE-status session. Renders the sidebar/topbar
      app shell (`components/app-shell/`) with a role-filtered nav
      (`lib/nav/main-nav.ts` — only lists routes that actually exist, by
      design, so there are no dead links).
- [x] First-administrator bootstrap script (`npm run create-admin`, reads
      `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD` from `.env`).
- [x] **Manually verified end-to-end in a real browser** against the local
      Docker MySQL database: login with wrong/right credentials, protected
      route redirect when logged out, sidebar/topbar render with real user
      data, sign-out, and confirmed via direct DB query that sign-out
      actually deletes the session row (not just the cookie). Caught and
      fixed one real runtime bug this way (a Base UI `Menu.GroupLabel`
      needed a `<Menu.Group>` wrapper — `components/ui/dropdown-menu.tsx`
      pattern) that `tsc`/`eslint`/`next build` all missed.
- [ ] Not yet built: password reset flow, and the "deactivation revokes all
      sessions" transactional helper (straightforward given
      `destroyAllSessionsForUser()` already exists in `session.ts` — wiring
      it into an actual admin action is Phase 3's User Management work).

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

## Local development database

A dedicated MySQL container for this project runs in Docker:

```
docker run -d \
  --name bfdo-mysql-dev \
  -e MYSQL_ROOT_PASSWORD=bfdo_dev_root_pw \
  -e MYSQL_DATABASE=bfdo_management \
  -e MYSQL_USER=bfdo_app \
  -e MYSQL_PASSWORD=bfdo_dev_app_pw \
  -p 3307:3306 \
  mysql:8
```

(Already created once — after a machine restart, Docker Desktop must be
running and the container restarted with `docker start bfdo-mysql-dev`
rather than re-run, or you'll get a "container name already in use" error.)
`.env`'s `DATABASE_URL` points at `localhost:3307` with these dev-only
credentials. This is intentionally on a non-default port (3307, not 3306)
because this machine already runs an unrelated project's MySQL container
on the standard port — the two are fully isolated from each other.

These are throwaway local credentials, not used anywhere near production.

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
