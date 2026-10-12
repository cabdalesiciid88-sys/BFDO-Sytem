# Security

This document tracks the security model as implemented, including the
deliberate tradeoffs made by moving off the originally-specified Supabase
stack onto Hostinger + MySQL. It will keep growing through Phase 6; treat
anything not yet listed under "Implemented" as not yet built.

## Authentication

- Passwords hashed with bcrypt (`bcryptjs`, cost factor to be set in
  `lib/auth` — never store or log plaintext passwords).
- Sessions are server-side records (`sessions` table), identified to the
  client only by an opaque random token in an httpOnly, `Secure`,
  `SameSite=Lax` cookie. The database stores only a SHA-256 hash of that
  token, so a stolen database dump cannot be replayed as a live session.
- No public self-registration. Accounts are created by a System
  Administrator (or the one-time bootstrap script); this matches the
  spec's closed-organization access model.

## Authorization — no database-level backstop

**This is the most important tradeoff in this build.** The original spec
assumed Postgres Row-Level Security as a second, database-enforced layer of
authorization beneath the application's own checks. MySQL has no RLS
equivalent, so on this stack:

- Every authorization decision is made exactly once, in application code
  (`lib/permissions/`), at the point a server action or route handler runs.
- If a server action forgets to call a permission check, there is **no**
  fallback — the query will simply run. This is why the architecture rule
  in `docs/architecture.md` ("all Prisma calls live in
  `features/<name>/actions.ts`") exists: it keeps every write/read path in
  one reviewable place per feature, so "does this feature check
  permissions?" is answerable by reading one short file.
- `tests/authorization` exists specifically to catch regressions here —
  treat a failing authorization test as a release blocker, not a flaky test
  to skip.

## File access

- Original uploaded files are never stored under `public/` or any
  web-server-indexed path. They live under `STORAGE_ROOT` (see
  `.env.example`), outside the app's served directory tree entirely.
- Storage paths are generated (UUID-based), never derived from the user's
  original filename — this avoids path traversal and filename-collision
  attacks, and the original filename is preserved only as metadata for
  display/download.
- Every file download goes through an authenticated route handler that
  re-checks the requesting user's permission for that specific media asset
  before streaming bytes. There is no "public storage bucket" shortcut —
  the public gallery is served through its own code path that only ever
  reads rows where `media_approvals.status = APPROVED` and returns a
  generated URL, never the raw storage path.
- Upload validation happens server-side: declared MIME type is checked
  against actual file content (magic-byte sniffing, not just the client's
  `Content-Type` header or file extension), and file size is capped by
  `MAX_UPLOAD_BYTES`.

## Secrets

- `DATABASE_URL`, `AUTH_SECRET`, SMTP credentials, etc. are read only from
  environment variables, server-side. `.env.example` lists every variable
  the app needs with placeholder values only — real secrets are never
  committed.
- There is no service-role/admin key that bypasses application
  authorization (unlike a Supabase service-role key) — because there is no
  Supabase. The MySQL credentials in `DATABASE_URL` are themselves
  sensitive and are scoped to a single application database user on
  Hostinger, not a shared admin account.

## Audit logging

- `audit_logs` is append-only by construction — no code path in this
  repository issues an UPDATE or DELETE against that model. Regression test
  in `tests/authorization` asserts this stays true.
- Logged events (as modules land): record creation/edit on sensitive
  entities, project status changes, media upload, media approval/rejection/
  revocation, role changes, account activation/deactivation, data exports.
  Logs never include passwords, session tokens, or full file contents.

## Dependency audit notes

- `mariadb` (the actual runtime DB driver, used by `@prisma/adapter-mariadb`)
  had several high-severity CVEs in the version Prisma pins by default
  (cleartext credential leakage despite `ssl: true`, multiple SQL-injection
  classes under certain charsets/options). Forced to the patched `3.5.4` via
  an `overrides` entry in `package.json` — verify this override still
  resolves to a non-vulnerable version (`npm audit`) after any future
  `npm update`.
- `npm audit` also flags `deepmerge-ts` and `mysql2` as high severity, but
  both live only inside the `prisma` CLI package's own dependency tree
  (used by `prisma migrate`/introspection tooling) — the deployed
  application never imports the `prisma` package, only `@prisma/client` +
  the patched `mariadb` driver above. `npm audit fix --force` would resolve
  this by downgrading the CLI to `prisma@6.19.3`, which predates the
  driver-adapter connection model this project relies on — not worth the
  regression for a dev-time-only exposure. Re-evaluate when Prisma ships a
  7.x patch that updates these transitive deps.

## Known gaps / not yet implemented

(Tracked here instead of silently deferred — see `docs/project-status.md`
for phase-by-phase status.)

- Rate limiting on login/password-reset endpoints.
- Security headers (CSP, HSTS, etc.) at the Next.js response layer.
- Dependency vulnerability scanning as part of a CI pipeline (no CI is
  configured yet — this is a single-developer build against a shared host,
  not a team repo with GitHub Actions configured).
- Automated backup verification/alerting (see `docs/backup-recovery.md`,
  added in Phase 6).
