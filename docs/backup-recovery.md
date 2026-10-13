# Backup & Recovery

There is no managed database/storage service doing this for you — MySQL and
the private file storage directory both live on the same Hostinger box
(`docs/architecture.md`). Backups are this project's responsibility,
driven by a small CLI script on a cPanel Cron Job, per the
"no persistent background worker" architecture decision.

## What gets backed up

1. **The database** — every table, via `mysqldump --single-transaction`
   (safe to run against a live InnoDB database without locking it).
2. **The private file storage directory** (`STORAGE_ROOT` — uploaded
   originals + generated thumbnails) — as a `tar.gz` archive.

Both are written as timestamped files into `BACKUP_DIR` by one script run:

```sh
npm run backup
```

Reads `DATABASE_URL` / `STORAGE_ROOT` from the environment (`.env` in
production), and `BACKUP_DIR` (default `./backups`). Produces:

```
backups/
  db-bfdo_management-2026-10-13T21-42-16-685Z.sql
  storage-2026-10-13T21-42-16-685Z.tar.gz
```

## Restoring

```sh
npm run restore -- <path-to-db-dump.sql> [path-to-storage-archive.tar.gz]
```

**Destructive** — overwrites whatever `DATABASE_URL` currently points at
(the dump includes `DROP TABLE IF EXISTS` before each `CREATE TABLE`, so it
cleanly replaces existing tables) and whatever `STORAGE_ROOT` currently
points at (the old directory there, if any, is deleted and replaced).
Always point `DATABASE_URL`/`STORAGE_ROOT` at a scratch target first to
verify a backup is actually restorable before trusting it against the real
one — see the drill below.

## Scheduling in production (Hostinger cPanel)

cPanel → **Cron Jobs** → add a daily job:

```sh
cd /home/<cpanel-user>/<app-dir> && npm run backup >> /home/<cpanel-user>/backup.log 2>&1
```

`BACKUP_DIR` should point **outside** the app's own directory tree (ideally
on a different disk/account than the database itself, or synced off-box —
a backup that lives next to the thing it's backing up doesn't protect
against a disk failure or an accidentally-deleted hosting account). Set it
via an env var in the cron command or in `.env`. Hostinger's own backup
tooling (File & Database backups in hPanel, if included in your plan) is a
reasonable second layer on top of this — redundancy here is a feature, not
waste.

Retention isn't automated by this script — prune old files in the cron
command itself if `BACKUP_DIR` isn't otherwise rotated, e.g. appending
`find "$BACKUP_DIR" -mtime +30 -delete` for a 30-day window.

## Local development

The two env vars that differ from production:

- `BACKUP_MYSQL_DOCKER_CONTAINER=bfdo-mysql-dev` — runs `mysqldump`/`mysql`
  *inside* the dev MySQL container instead of expecting those client
  binaries on your host PATH (this machine's Windows host doesn't have
  them; the container does). **Never set this in production** — Hostinger
  isn't Docker.
- On Windows, GNU tar misreads an absolute `C:\...` path as a
  `host:path` remote-tar spec (the drive-letter colon) — both scripts pass
  `--force-local` to disable that, harmlessly on Linux too.

## The restore drill (actually tested, not just documented)

Run as part of Phase 6 verification, 2026-10-13:

1. Backed up the real local dev database (`bfdo_management`: 2 users, 1
   project, 1 activity, 1 media asset, 17 audit log entries at the time)
   and its `.local-storage` directory.
2. Restored both into the **separate test database**
   (`bfdo_management_test` — see `docs/testing.md`) and a scratch storage
   path, never touching the live dev data.
3. Verified: row counts for `users`/`projects`/`activities`/`media_assets`/
   `audit_logs` matched exactly between source and restored database;
   restored file tree had the same files; MD5 checksums of both restored
   files matched the originals byte-for-byte.

This caught a real bug before it ever mattered: the first version of
`scripts/restore.ts` extracted the storage archive directly into the
target's parent directory, but a tar archive's internal top-level folder
name is whatever `STORAGE_ROOT` was named **at backup time** — on this
run that happened to equal the live `.local-storage` directory's name
again, so the "scratch" restore silently landed back on top of the live
directory instead of the intended scratch path (harmless this time only
because the content happened to be identical). Fixed by extracting into a
throwaway staging directory first, then renaming the one extracted folder
to the actual requested `STORAGE_ROOT` — see the script's comments. This
is exactly the kind of failure "backup/recovery must be actually tested,
not just documented" exists to catch — a restore script that looked
correct on inspection, compiled cleanly, and would have passed a review,
but silently did the wrong thing the first time it ran against real
mismatched paths.

## What this doesn't cover yet

- No automated backup **verification** (e.g., a weekly job that restores
  into a scratch database and checks row counts, the way the manual drill
  above did) — tracked as a known gap in `docs/security.md`.
- No point-in-time recovery (binlog-based) — only whatever the last
  `mysqldump` snapshot captured. Acceptable at this org's data-change
  volume (see `docs/database-schema.md`'s "hundreds of activities/media
  per month" scale note); revisit if that changes materially.
