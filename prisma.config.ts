import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Used by `prisma migrate` / `prisma studio` / `prisma db ...` CLI commands
// only. The running application does not read this file — it builds its own
// driver adapter from DATABASE_URL at runtime (see lib/db/client.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
