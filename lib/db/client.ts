import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Reuse a single PrismaClient (and its underlying connection pool) across
// hot reloads in dev, and across Passenger's module cache in production, to
// avoid exhausting MySQL's connection limit (shared hosting plans cap this
// low — see docs/deployment.md).
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and configure a MySQL connection string.",
    );
  }

  const adapter = new PrismaMariaDb(connectionString);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function getPrismaClient(): PrismaClient {
  const client = globalForPrisma.prisma ?? createPrismaClient();
  globalForPrisma.prisma = client;
  return client;
}

// Lazy: constructing the real client eagerly at module scope means just
// *importing* this file throws without DATABASE_URL set — which breaks
// `next build`'s "Collecting page data" step, since that step loads every
// route module (even fully dynamic ones with no static output) to read
// their config. Deferring construction to first property access means the
// build only needs this to succeed at actual request time, when the real
// production DATABASE_URL is configured.
export const prisma = new Proxy({} as PrismaClient, {
  get: (_target, prop) => Reflect.get(getPrismaClient(), prop),
});
