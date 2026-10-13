import "server-only";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@prisma/client";

export type AuditLogFilters = {
  actorSearch?: string;
  action?: string;
  targetType?: string;
  from?: Date;
  to?: Date;
};

const PAGE_SIZE = 50;

/** Admin-only (enforced by the caller, CAN_VIEW_AUDIT_LOGS) — append-only
 *  log, read side. Newest first, simple offset pagination since volume is
 *  expected to stay in the thousands, not millions, for this org's size. */
export async function listAuditLogs(filters: AuditLogFilters, page = 1) {
  const and: Prisma.AuditLogWhereInput[] = [];

  if (filters.actorSearch) {
    and.push({
      actor: {
        OR: [
          { fullName: { contains: filters.actorSearch } },
          { email: { contains: filters.actorSearch } },
        ],
      },
    });
  }
  if (filters.action) and.push({ action: { contains: filters.action } });
  if (filters.targetType) and.push({ targetType: filters.targetType });
  if (filters.from || filters.to) {
    and.push({
      createdAt: {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to
          ? { lt: new Date(filters.to.getFullYear(), filters.to.getMonth(), filters.to.getDate() + 1) }
          : {}),
      },
    });
  }

  const where: Prisma.AuditLogWhereInput = and.length > 0 ? { AND: and } : {};

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function listAuditTargetTypes(): Promise<string[]> {
  const rows = await prisma.auditLog.findMany({
    select: { targetType: true },
    distinct: ["targetType"],
  });
  return rows.map((r) => r.targetType).sort();
}
