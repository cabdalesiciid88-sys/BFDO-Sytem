import "dotenv/config";
import { defineConfig } from "prisma/config";

// Used by `prisma migrate` / `prisma studio` / `prisma db ...` CLI commands
// only. The running application does not read this file — it builds its own
// driver adapter from DATABASE_URL at runtime (see lib/db/client.ts).
// `prisma generate` loads this config too but never touches `datasource.url`,
// so this falls back to a placeholder instead of using the `env()` helper
// (which throws eagerly, at config-load time, for every prisma command) —
// that would otherwise break `generate` in a build environment with no
// DATABASE_URL set yet, such as a fresh Hostinger deploy before the
// production database is connected.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "mysql://placeholder",
  },
});
