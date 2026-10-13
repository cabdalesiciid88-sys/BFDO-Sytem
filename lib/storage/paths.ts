import "server-only";
import path from "node:path";
import { randomUUID } from "node:crypto";

function storageRoot(): string {
  const root = process.env.STORAGE_ROOT;
  if (!root) {
    throw new Error(
      "STORAGE_ROOT is not set. Copy .env.example to .env and configure a local storage path.",
    );
  }
  return path.resolve(root);
}

/**
 * Generates a non-guessable, year/month-bucketed relative storage path —
 * never derived from the uploader's original filename (avoids path
 * traversal and filename-collision attacks; see docs/security.md "File
 * access"). Always forward-slash-separated so the value stored in
 * `media_assets.storagePath` is OS-independent.
 */
export function generateStoragePath(extension: string): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return [year, month, `${randomUUID()}.${extension}`].join("/");
}

/** Same scheme as generateStoragePath(), for the companion thumbnail file. */
export function thumbnailPathFor(storagePath: string): string {
  const dir = storagePath.slice(0, storagePath.lastIndexOf("/"));
  const base = storagePath.slice(storagePath.lastIndexOf("/") + 1);
  const id = base.slice(0, base.lastIndexOf("."));
  return `${dir}/${id}-thumb.jpg`;
}

/**
 * Resolves a relative storage path to an absolute filesystem path under
 * STORAGE_ROOT, rejecting anything that would escape it. Relative paths
 * only ever originate from generateStoragePath()/thumbnailPathFor() or a
 * trusted database row — this is defense-in-depth, not the primary guard.
 */
export function absolutePathFor(relativeStoragePath: string): string {
  const root = storageRoot();
  const segments = relativeStoragePath.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error("Invalid storage path.");
  }

  const resolved = path.join(root, ...segments);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error("Resolved path escapes STORAGE_ROOT.");
  }
  return resolved;
}
