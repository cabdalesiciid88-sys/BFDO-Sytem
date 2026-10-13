# Deployment (Hostinger cPanel / Passenger)

This app targets Hostinger shared/Business hosting via cPanel's **"Setup
Node.js App"** (Phusion Passenger) — not Vercel, not a container platform.
See `docs/architecture.md` for why. This doc is the step-by-step; read
`docs/security.md` and `docs/backup-recovery.md` too before a real
production deploy.

## One-time prerequisites

1. **A MySQL database**, created via hPanel's "MySQL Databases" section
   (or an existing Remote MySQL you have credentials for). Note the host,
   port, database name, user, and password — these become `DATABASE_URL`.
2. **Node.js version**, confirmed in cPanel's "Setup Node.js App" version
   selector. This project is developed against Node 24; if Hostinger's
   selector tops out lower, re-verify `npm run build` and the test suites
   (`docs/testing.md`) against whatever version is actually available
   before trusting a deploy — don't assume compatibility.
3. **SSH access** (or cPanel's Terminal), needed to run `npx prisma migrate
   deploy` and `npm run create-admin` against the production database —
   neither is something the running app does for you automatically.
4. A **`STORAGE_ROOT` path outside any web-served directory** — e.g.
   `/home/<cpanel-user>/bfdo-storage`, never under `public_html` or this
   app's own project directory if that directory is itself served. See
   `docs/security.md` "File access."

## Environment variables

Set these in cPanel's "Setup Node.js App" → your app → **environment
variables** UI (not a committed `.env` file — see `.env.example` for the
full list and what each one does). Two categories behave differently:

- **Build-time**: `NEXT_PUBLIC_APP_URL` is inlined into the client bundle
  at `next build` time. If you change it, rebuild — restarting the running
  server alone won't pick up a new value.
- **Runtime-only**: everything else (`DATABASE_URL`, `AUTH_SECRET`,
  `STORAGE_ROOT`, `MAX_UPLOAD_BYTES`, SMTP_*) is read from `process.env`
  when the server starts — a restart (not a rebuild) is enough to pick up
  a change to these.

Generate `AUTH_SECRET` once with:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Build & deploy steps

1. **Build** (either locally and upload the artifact, or on the server via
   SSH/Terminal — either works, but see the Prisma note below if you build
   locally on a different OS than the server):

   ```sh
   npm ci
   npm run build
   ```

   `next.config.ts` sets `output: "standalone"`, so this produces a
   self-contained server at `.next/standalone/server.js` with its own
   `node_modules` — Passenger runs this directly, not `next start`.

2. **Copy static assets into the standalone output** — `output: "standalone"`
   deliberately does *not* include these automatically, a well-known
   Next.js quirk:

   ```sh
   cp -r public .next/standalone/public
   cp -r .next/static .next/standalone/.next/static
   ```

3. **Prisma: generate the client for the server's actual platform, then
   migrate.** If you built on a different OS (e.g. this project's Windows
   dev machine) than the Linux server, `node_modules/.prisma` from that
   build won't have the right native engine for Hostinger — run these
   **on the server itself** via SSH, pointed at the real production
   `DATABASE_URL`:

   ```sh
   npx prisma generate
   npx prisma migrate deploy
   ```

   `migrate deploy` (not `migrate dev`) applies existing migrations without
   prompting or generating new ones — the right command for anywhere that
   isn't your own dev machine.

4. **Point cPanel's "Setup Node.js App" at `.next/standalone/server.js`**
   as the application startup file, with the environment variables from
   above configured, then **Restart** the app from that same cPanel panel.

5. **First admin account** (once, ever — after this, all other accounts
   are created through the admin-only Team page):

   ```sh
   BOOTSTRAP_ADMIN_EMAIL="you@example.com" BOOTSTRAP_ADMIN_PASSWORD="..." npm run create-admin
   ```

6. **Smoke-test**: sign in, confirm the dashboard loads with real data,
   upload a test file to the Digital Archive and confirm it downloads
   correctly (exercises `STORAGE_ROOT` actually being writable and
   correctly pathed), then delete that test file's row if you don't want
   it lingering.

## Redeploying after a code change

Repeat steps 1–2 (rebuild + re-copy static assets), run
`npx prisma migrate deploy` again if the schema changed (it's a no-op if
there's nothing new to apply), then **Restart** from cPanel. There's no
zero-downtime/rolling-deploy story here — Passenger restarts the single
app process, which drops in-flight requests briefly. Acceptable for this
scale; revisit if that ever stops being true.

## Rollback

Keep the previous build's `.next/standalone` directory (or a git tag/commit
you can rebuild from) before deploying a new one. If a deploy misbehaves,
restore the previous standalone directory and Restart, or `git checkout`
the previous commit and repeat the build steps. There is no automated
rollback mechanism — this is a manual step, matching the "single-developer
build against a shared host, not a team repo with CI/CD" posture noted in
`docs/security.md`.

## Backups

Not part of a deploy, but don't deploy without this already running — see
`docs/backup-recovery.md` for the cPanel Cron Job setup (`npm run backup`)
and the restore drill that's already been run and verified against this
exact script.
