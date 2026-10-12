import "server-only";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@prisma/client";

/**
 * The only way anything in this codebase writes to audit_logs. There is no
 * corresponding update/delete helper — the table is append-only by
 * construction (see docs/permissions.md rule 6, tests/authorization).
 */
export async function recordAuditLog(entry: {
  actorId: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
  beforeValue?: Prisma.InputJsonValue;
  afterValue?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata,
      beforeValue: entry.beforeValue,
      afterValue: entry.afterValue,
      ipAddress: entry.ipAddress ?? null,
    },
  });
}
