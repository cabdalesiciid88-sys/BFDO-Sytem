import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const SCAN_DIRS = ["app", "features", "lib"];
const MUTATING_CALL = /\.auditLog\.(update|updateMany|delete|deleteMany|upsert)\s*\(/;

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * docs/permissions.md hard rule 6: "Audit log rows are append-only. No
 * server action may update or delete an audit_logs row; this is enforced
 * by never writing such a code path at all." A static scan is the right
 * tool here — the invariant is "this call pattern must never appear in the
 * codebase," not runtime behavior to exercise against a database.
 */
describe("hard rule 6 — audit_logs is append-only by construction", () => {
  it("no source file calls prisma.auditLog.update/updateMany/delete/deleteMany/upsert", () => {
    const offenders: string[] = [];
    for (const dir of SCAN_DIRS) {
      for (const file of listSourceFiles(join(ROOT, dir))) {
        const content = readFileSync(file, "utf8");
        if (MUTATING_CALL.test(content)) {
          offenders.push(file.replace(ROOT, ""));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("lib/audit/log.ts only ever creates rows (sanity check that the scan pattern itself is meaningful)", () => {
    const content = readFileSync(join(ROOT, "lib", "audit", "log.ts"), "utf8");
    expect(content).toContain("prisma.auditLog.create(");
    expect(MUTATING_CALL.test(content)).toBe(false);
  });
});
