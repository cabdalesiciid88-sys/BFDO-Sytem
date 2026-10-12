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

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
