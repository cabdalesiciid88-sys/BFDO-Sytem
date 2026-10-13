import "server-only";
import { prisma } from "@/lib/db/client";
import { CAN_VIEW_ORG_WIDE } from "@/lib/permissions/roles";
import { assignedProjectIds } from "@/lib/permissions/project-access";
import { requireCanViewDecision } from "@/lib/permissions/meeting-access";
import type { DecisionStatus, Prisma, Role } from "@prisma/client";

export type CurrentUserLike = { id: string; role: Role };

export type DecisionListFilters = {
  search?: string;
  projectId?: string;
  status?: DecisionStatus;
};

export async function listDecisions(user: CurrentUserLike, filters: DecisionListFilters = {}) {
  const and: Prisma.DecisionWhereInput[] = [];

  if (!CAN_VIEW_ORG_WIDE.has(user.role)) {
    const projectIds = await assignedProjectIds(user.id);
    and.push({
      OR: [
        ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : []),
        { responsibleId: user.id },
      ],
    });
  }

  if (filters.projectId) and.push({ projectId: filters.projectId });
  if (filters.status) and.push({ status: filters.status });
  if (filters.search) and.push({ description: { contains: filters.search } });

  return prisma.decision.findMany({
    where: and.length > 0 ? { AND: and } : {},
    include: {
      project: { select: { id: true, title: true } },
      responsible: { select: { id: true, fullName: true } },
      meeting: { select: { id: true, title: true } },
    },
    orderBy: { decidedAt: "desc" },
  });
}

/** Throws ForbiddenError (via requireCanViewDecision) if the user can't view it. */
export async function getDecisionDetail(user: CurrentUserLike, decisionId: string) {
  const decision = await prisma.decision.findUnique({
    where: { id: decisionId },
    include: {
      project: { select: { id: true, title: true } },
      responsible: { select: { id: true, fullName: true, email: true } },
      meeting: { select: { id: true, title: true } },
    },
  });
  if (!decision) return null;

  await requireCanViewDecision(user, decision);
  return decision;
}
