import "server-only";
import { prisma } from "@/lib/db/client";
import { CAN_VIEW_ORG_WIDE } from "@/lib/permissions/roles";
import { assignedProjectIds } from "@/lib/permissions/project-access";
import { requireActivityAccess } from "@/lib/permissions/activity-access";
import type { Prisma, Role } from "@prisma/client";

export type CurrentUserLike = { id: string; role: Role };

export type ActivityListFilters = {
  search?: string;
  projectId?: string;
  category?: string;
  status?: "ACTIVE" | "ARCHIVED";
};

/**
 * Org-wide roles see every activity; everyone else sees activities tied to
 * a project they're on, plus anything they created, are responsible for, or
 * participated in — mirroring lib/permissions/activity-access.ts's view rule.
 */
export async function listActivities(user: CurrentUserLike, filters: ActivityListFilters = {}) {
  const and: Prisma.ActivityWhereInput[] = [];

  if (!CAN_VIEW_ORG_WIDE.has(user.role)) {
    const projectIds = await assignedProjectIds(user.id);
    and.push({
      OR: [
        ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : []),
        { createdById: user.id },
        { responsibleId: user.id },
        { participants: { some: { userId: user.id } } },
      ],
    });
  }

  if (filters.projectId) and.push({ projectId: filters.projectId });
  if (filters.category) and.push({ category: filters.category });
  if (filters.status) and.push({ status: filters.status });
  if (filters.search) {
    and.push({
      OR: [
        { title: { contains: filters.search } },
        { referenceCode: { contains: filters.search } },
        { location: { contains: filters.search } },
      ],
    });
  }

  return prisma.activity.findMany({
    where: and.length > 0 ? { AND: and } : {},
    include: {
      project: { select: { id: true, title: true } },
      responsible: { select: { id: true, fullName: true } },
      _count: { select: { participants: true, activityMedia: true } },
    },
    orderBy: { activityDate: "desc" },
  });
}

/** Throws ForbiddenError (via requireActivityAccess) if the user can't view it. */
export async function getActivityDetail(user: CurrentUserLike, activityId: string) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: {
      project: { select: { id: true, title: true } },
      responsible: { select: { id: true, fullName: true, email: true } },
      createdBy: { select: { id: true, fullName: true } },
      participants: {
        include: { user: { select: { id: true, fullName: true, email: true } } },
      },
    },
  });
  if (!activity) return null;

  await requireActivityAccess(user, activity);
  return activity;
}

export async function listActivityCategories(): Promise<string[]> {
  const rows = await prisma.activity.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });
  return rows.map((r) => r.category).filter((c): c is string => !!c).sort();
}

/** Projects this user is allowed to file a new activity under. */
export async function listCreatableProjects(user: CurrentUserLike) {
  if (user.role === "SYSTEM_ADMIN") {
    return prisma.project.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });
  }

  const projectIds = await assignedProjectIds(user.id);
  if (projectIds.length === 0) return [];

  return prisma.project.findMany({
    where: { id: { in: projectIds }, status: { not: "ARCHIVED" } },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}
