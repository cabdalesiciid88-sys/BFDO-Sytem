import "server-only";
import { prisma } from "@/lib/db/client";

/**
 * Deactivation must flip status AND delete every session for the user in
 * the SAME transaction (docs/permissions.md hard rule 3), so access ends on
 * the user's very next request rather than whenever a stale session happens
 * to expire. Never split these into two separate calls — if the status
 * update succeeded but the session delete failed (or vice versa) outside a
 * transaction, a deactivated user could keep a live session.
 */
export async function deactivateUser(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { status: "DEACTIVATED" } });
    await tx.session.deleteMany({ where: { userId } });
  });
}

export async function reactivateUser(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
}
