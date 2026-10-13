import "server-only";
import { prisma } from "@/lib/db/client";
import { CAN_VIEW_ORG_WIDE } from "@/lib/permissions/roles";
import { assignedProjectIds, requireProjectAccess } from "@/lib/permissions/project-access";
import { listActiveUsers } from "@/lib/users/queries";
import type { Prisma, ProjectStatus, Role } from "@prisma/client";

export type CurrentUserLike = { id: string; role: Role };

export type ProjectListFilters = {
  search?: string;
  status?: ProjectStatus;
  category?: string;
};

/**
 * Org-wide roles (Admin/Leadership) see every project; everyone else only
 * sees projects they're assigned to (docs/permissions.md: "View project").
 */
export async function listProjects(user: CurrentUserLike, filters: ProjectListFilters = {}) {
  const where: Prisma.ProjectWhereInput = {};

  if (!CAN_VIEW_ORG_WIDE.has(user.role)) {
    const ids = await assignedProjectIds(user.id);
    where.id = { in: ids.length > 0 ? ids : ["__none__"] };
  }

  if (filters.status) where.status = filters.status;
  if (filters.category) where.category = filters.category;
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search } },
      { referenceCode: { contains: filters.search } },
      { location: { contains: filters.search } },
    ];
  }

  return prisma.project.findMany({
    where,
    include: {
      manager: { select: { id: true, fullName: true } },
      _count: { select: { members: true, activities: true, tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Throws ForbiddenError (via requireProjectAccess) if the user isn't assigned. */
export async function getProjectDetail(user: CurrentUserLike, projectId: string) {
  await requireProjectAccess(user, projectId);

  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      manager: { select: { id: true, fullName: true, email: true } },
      members: {
        include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
        orderBy: { addedAt: "asc" },
      },
      _count: { select: { activities: true, tasks: true, meetings: true, decisions: true } },
    },
  });
}

export async function listActiveUsersForAssignment() {
  return listActiveUsers();
}

export async function listProjectCategories(): Promise<string[]> {
  const rows = await prisma.project.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });
  return rows.map((r) => r.category).filter((c): c is string => !!c).sort();
}
