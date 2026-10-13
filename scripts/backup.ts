/**
 * Backs up the database (mysqldump) and the private file storage directory
 * (tar.gz) to timestamped files under BACKUP_DIR. Meant to be invoked by a
 * cPanel Cron Job in production (see docs/backup-recovery.md) — there is
 * no persistent background worker in this app's architecture
 * (docs/architecture.md), so scheduled jobs are small CLI scripts like
 * this one, not an in-process scheduler.
 *
 * Usage: npx tsx scripts/backup.ts
 * Env:
 *   DATABASE_URL                   required (read from .env by default)
 *   STORAGE_ROOT                   optional — skips file backup if unset
 *   BACKUP_DIR                     optional, default "./backups"
 *   BACKUP_MYSQL_DOCKER_CONTAINER  optional, LOCAL DEV ONLY — runs
 *                                  mysqldump/mysql inside this Docker
 *                                  container instead of expecting the
 *                                  mysqldump/mysql client binaries on PATH.
 *                                  Never set this in production.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

function parseDatabaseUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port || "3306",
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
  };
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env and configure it.");
    process.exitCode = 1;
    return;
  }

  const { host, port, user, password, database } = parseDatabaseUrl(databaseUrl);
  const backupDir = resolve(process.env.BACKUP_DIR || "./backups");
  const dockerContainer = process.env.BACKUP_MYSQL_DOCKER_CONTAINER;
  const ts = timestamp();

  mkdirSync(backupDir, { recursive: true });

  // --- Database dump ---
  const sqlPath = join(backupDir, `db-${database}-${ts}.sql`);
  console.log(`Dumping database "${database}" to ${sqlPath} ...`);

  const dumpArgs = ["-u", user, `-p${password}`, "--single-transaction", "--routines", "--triggers", database];
  const dumpResult = dockerContainer
    ? spawnSync("docker", ["exec", dockerContainer, "mysqldump", ...dumpArgs], {
        stdio: ["ignore", "pipe", "inherit"],
        maxBuffer: 1024 * 1024 * 1024,
      })
    : spawnSync("mysqldump", ["-h", host, "-P", port, ...dumpArgs], {
        stdio: ["ignore", "pipe", "inherit"],
        maxBuffer: 1024 * 1024 * 1024,
      });

  if (dumpResult.status !== 0 || !dumpResult.stdout || dumpResult.stdout.length === 0) {
    console.error("mysqldump failed or produced no output.");
    process.exitCode = 1;
    return;
  }
  writeFileSync(sqlPath, dumpResult.stdout);
  console.log(`Database dump written (${(dumpResult.stdout.length / 1024 / 1024).toFixed(2)} MiB).`);

  // --- File storage archive ---
  const storageRoot = process.env.STORAGE_ROOT;
  if (storageRoot && existsSync(storageRoot)) {
    const resolvedStorage = resolve(storageRoot);
    const archivePath = join(backupDir, `storage-${ts}.tar.gz`);
    console.log(`Archiving ${resolvedStorage} to ${archivePath} ...`);
    const tarResult = spawnSync(
      "tar",
      // --force-local: on Windows, GNU tar misreads an absolute "C:\..."
      // path as a "host:path" remote-tar spec (the drive-letter colon) —
      // harmless to pass on Linux too, since real paths there never
      // contain that ambiguity.
      ["--force-local", "-czf", archivePath, "-C", dirname(resolvedStorage), basename(resolvedStorage)],
      { stdio: "inherit" },
    );
    if (tarResult.status !== 0) {
      console.error("tar failed while archiving the storage directory.");
      process.exitCode = 1;
      return;
    }
    console.log("Storage archive written.");
  } else {
    console.log("STORAGE_ROOT not set or doesn't exist yet — skipping file storage backup.");
  }

  console.log("Backup complete:", backupDir);
}

main();
