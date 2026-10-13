import "server-only";
import { prisma } from "@/lib/db/client";

/** Shared across features that need to populate a "pick a person" select. */
export async function listActiveUsers() {
  return prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, fullName: true, email: true, role: true },
    orderBy: { fullName: "asc" },
  });
}
