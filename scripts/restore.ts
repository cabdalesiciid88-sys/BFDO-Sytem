/**
 * Restores a database dump (and optionally a file storage archive) produced
 * by scripts/backup.ts. DESTRUCTIVE: overwrites existing data in the
 * target database (whatever DATABASE_URL points at when you run this) and
 * extracts into the target STORAGE_ROOT. See docs/backup-recovery.md for
 * the full drill — always restore into a scratch/test database first to
 * verify a backup is actually usable before trusting it.
 *
 * Usage: npx tsx scripts/restore.ts <db-dump.sql> [storage-archive.tar.gz]
 * Env: same as scripts/backup.ts (DATABASE_URL, STORAGE_ROOT,
 *      BACKUP_MYSQL_DOCKER_CONTAINER for local dev).
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

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

function main() {
  const [, , sqlPath, storageArchivePath] = process.argv;
  if (!sqlPath) {
    console.error("Usage: npx tsx scripts/restore.ts <db-dump.sql> [storage-archive.tar.gz]");
    process.exitCode = 1;
    return;
  }
  if (!existsSync(sqlPath)) {
    console.error(`File not found: ${sqlPath}`);
    process.exitCode = 1;
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env and configure it.");
    process.exitCode = 1;
    return;
  }

  const { host, port, user, password, database } = parseDatabaseUrl(databaseUrl);
  const dockerContainer = process.env.BACKUP_MYSQL_DOCKER_CONTAINER;

  console.log(`Restoring ${sqlPath} into database "${database}" at ${host}:${port}.`);
  console.log("This OVERWRITES existing data in that database.");

  const sql = readFileSync(sqlPath);
  const restoreArgs = ["-u", user, `-p${password}`, database];
  const restoreResult = dockerContainer
    ? spawnSync("docker", ["exec", "-i", dockerContainer, "mysql", ...restoreArgs], {
        input: sql,
        stdio: ["pipe", "inherit", "inherit"],
      })
    : spawnSync("mysql", ["-h", host, "-P", port, ...restoreArgs], {
        input: sql,
        stdio: ["pipe", "inherit", "inherit"],
      });

  if (restoreResult.status !== 0) {
    console.error("Database restore failed.");
    process.exitCode = 1;
    return;
  }
  console.log("Database restored.");

  if (storageArchivePath) {
    if (!existsSync(storageArchivePath)) {
      console.error(`File not found: ${storageArchivePath}`);
      process.exitCode = 1;
      return;
    }
    const storageRoot = process.env.STORAGE_ROOT;
    if (!storageRoot) {
      console.error("STORAGE_ROOT is not set — cannot restore files without knowing where to put them.");
      process.exitCode = 1;
      return;
    }
    const resolvedStorage = resolve(storageRoot);
    const parent = dirname(resolvedStorage);
    mkdirSync(parent, { recursive: true });

    // The archive's internal top-level folder is named after whatever
    // STORAGE_ROOT was at BACKUP time — it won't generally match this
    // restore's STORAGE_ROOT (e.g. restoring a prod backup into a local
    // scratch path). Extracting straight into `parent` would silently
    // recreate that OLD name there instead of the requested STORAGE_ROOT,
    // which on a repeat restore into the same parent as the original can
    // even land back on top of a live, unrelated directory. Extract into
    // a throwaway staging dir first, then rename the one extracted folder
    // to the actual target.
    const stagingDir = join(parent, `.restore-staging-${Date.now()}`);
    mkdirSync(stagingDir, { recursive: true });
    console.log(`Extracting ${storageArchivePath} into staging directory ${stagingDir} ...`);
    const tarResult = spawnSync("tar", ["--force-local", "-xzf", storageArchivePath, "-C", stagingDir], {
      stdio: "inherit",
    });
    if (tarResult.status !== 0) {
      console.error("tar extraction failed.");
      rmSync(stagingDir, { recursive: true, force: true });
      process.exitCode = 1;
      return;
    }

    const extractedEntries = readdirSync(stagingDir);
    if (extractedEntries.length !== 1) {
      console.error(
        `Expected exactly one top-level directory in the archive, found: ${extractedEntries.join(", ") || "(empty)"}`,
      );
      rmSync(stagingDir, { recursive: true, force: true });
      process.exitCode = 1;
      return;
    }

    if (existsSync(resolvedStorage)) {
      console.log(`Removing existing ${resolvedStorage} before restoring over it ...`);
      rmSync(resolvedStorage, { recursive: true, force: true });
    }
    renameSync(join(stagingDir, extractedEntries[0]), resolvedStorage);
    rmSync(stagingDir, { recursive: true, force: true });

    console.log(`Files restored into ${resolvedStorage}.`);
  }

  console.log("Restore complete.");
}

main();
