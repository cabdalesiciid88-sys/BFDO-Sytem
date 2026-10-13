// Side-effect-only module, imported before anything that touches
// lib/db/client. ES import statements execute in textual order relative to
// each other (before any other top-level code), so putting this in its own
// module — imported first — guarantees DATABASE_URL is set before
// lib/db/client's module-level PrismaClient construction runs. Doing the
// dotenv call directly inside e2e/seed.ts doesn't work: its own `import
// { prisma } from "../lib/db/client"` would be hoisted above it.
import { config } from "dotenv";

config({ path: ".env.test", override: true });
