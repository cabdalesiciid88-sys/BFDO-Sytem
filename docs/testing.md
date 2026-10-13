# Testing

Three layers, each against a **real** database rather than mocks — this
project's QA approach throughout has been "exercise the real thing," not
simulate it (see `docs/project-status.md`'s bug-finding history: every real
bug found so far was caught by actually running the app, not by a mock
agreeing with itself).

## Layers

1. **`tests/`** (Vitest) — unit tests for pure logic (`tests/permissions`)
   and integration tests that hit a real database (`tests/auth`,
   `tests/authorization`). Run: `npm test` (or `npm run test:watch`).
2. **`e2e/`** (Playwright) — browser-driven golden-path and access-control
   specs against a real running `next dev` instance. Run: `npm run test:e2e`.
3. Manual browser verification — still the primary way every feature in
   this codebase has been checked end-to-end; the automated suites above
   cover the security-critical paths specifically (see "What's covered").

## Databases — never the dev database

Both automated layers use a **dedicated test database**
(`bfdo_management_test`, same Docker container as dev, different schema),
configured in `.env.test` (gitignored, like `.env` — create it yourself,
see below). This keeps automated test churn (creating/deleting users,
projects, sessions) from ever touching the data you're using for manual
browser verification in `bfdo_management`.

Create it once:

```sh
docker exec bfdo-mysql-dev mysql -u root -p<root password> -e \
  "CREATE DATABASE IF NOT EXISTS bfdo_management_test; GRANT ALL PRIVILEGES ON bfdo_management_test.* TO 'bfdo_app'@'%'; FLUSH PRIVILEGES;"

DATABASE_URL="mysql://bfdo_app:<app password>@localhost:3307/bfdo_management_test" npx prisma migrate deploy
```

Then create `.env.test` (not committed) pointing `DATABASE_URL` at that
database — see `.env.example` for the other variables it needs
(`STORAGE_ROOT`, `AUTH_SECRET`, etc.; use throwaway values, never
production secrets).

`tests/setup.ts` (Vitest `setupFiles`) and `e2e/env.ts` (imported first,
before `lib/db/client`, in Playwright's `globalSetup`) both load
`.env.test` with `override: true`. **Import order matters**: `lib/db/client`
constructs its `PrismaClient` at module-load time from
`process.env.DATABASE_URL`, and ES `import` statements are hoisted above
other code — so the dotenv call must live in its own module, imported
*before* anything that imports `lib/db/client`, or `DATABASE_URL` won't be
set yet when the client is constructed. (This bit us once while building
this suite — see `e2e/env.ts`'s comment.)

`tests/helpers/reset-db.ts` wipes every table (in FK-safe order) before
each integration test via `beforeEach`, so tests never depend on leftover
state from a previous run. `tests/helpers/factories.ts` has `createTestUser`
/ `createTestProject` helpers for the common setup.

`"server-only"` (the package that makes `lib/`/`features/*/queries.ts`
files throw if imported from a client component) also throws when imported
outside Next.js's own bundler — including under Vitest. `vitest.config.ts`
aliases it to `tests/stubs/server-only.ts`, a no-op: Next's build is the
thing actually enforcing that boundary, so neutering the check under
Vitest doesn't weaken anything real.

## What's covered

- `tests/permissions/roles.test.ts` — every capability constant in
  `lib/permissions/roles.ts` against docs/permissions.md's full matrix,
  exact-set (not just "includes") so an accidental extra role is caught
  too, not just a missing one.
- `tests/auth/` — session lifecycle (create/validate/expire/destroy,
  deactivated-user rejection) and password hashing.
- `tests/authorization/hard-rule-{1-6}-*.test.ts` — one file per hard rule
  listed in `docs/permissions.md`, by name, so it's easy to find which test
  backs which rule. Rule 6 (audit log append-only) is a static source scan,
  not a DB test — the invariant is "this call pattern never appears in the
  codebase," which a scan checks more directly than any runtime assertion
  could.
- `e2e/golden-path.spec.ts` — login → dashboard → logout, plus the
  generic-error-on-wrong-password behavior (no account-enumeration leak).
- `e2e/admin-route-protection.spec.ts` — a signed-in Team Member gets a
  real 404 on `/team`, `/audit`, `/settings` via direct navigation (not
  just a hidden sidebar link), and confirms those links are in fact absent
  from their sidebar too.

**Not covered yet** (honest gap, not silently skipped): most feature CRUD
paths (Projects, Tasks, Meetings, Archive upload, Reports, etc.) have no
automated test — they've been verified by hand in a browser each time they
shipped (see `docs/project-status.md`'s per-phase "manually verified"
notes) but don't have regression coverage. If a bug recurs in one of these
areas, write a regression test for it at that point rather than trying to
backfill exhaustive coverage speculatively.

## Playwright specifics

- `playwright.config.ts`'s `webServer` launches `next dev --port 3100`
  (not 3000, so it doesn't collide with a dev server you're already running
  manually) with `DATABASE_URL` overridden to the test database via the
  `webServer.env` option.
- **Next.js refuses to run two `next dev` instances from the same project
  directory at once, regardless of port.** If you have `npm run dev`
  running locally, stop it before `npm run test:e2e` (and restart it
  after) — Playwright's own webServer will fail to start with "Another
  next dev server is already running" otherwise.
- Timeouts are set generously (20s) because Turbopack dev mode compiles
  each route on its first hit — several real seconds per route, the same
  thing you'll see as "○ Compiling /whatever ..." the first time you visit
  a page after a fresh `next dev` start. The default 5s Playwright timeout
  is too tight for a cold route on a freshly-started server; this isn't
  flakiness to retry around, it's a known, explainable cost specific to
  dev mode (production's prebuilt `.next` output doesn't have this cost).
