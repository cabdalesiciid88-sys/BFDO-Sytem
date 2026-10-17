import "server-only";
import { prisma } from "@/lib/db/client";
import { CAN_VIEW_ORG_WIDE } from "@/lib/permissions/roles";
import { assignedProjectIds } from "@/lib/permissions/project-access";
import { requireCanViewTask } from "@/lib/permissions/task-access";
import type { Prisma, Role, TaskPriority, TaskStatus } from "@prisma/client";

export type CurrentUserLike = { id: string; role: Role };

export type TaskListFilters = {
  search?: string;
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  onlyMine?: boolean;
  overdue?: boolean;
};

/**
 * Org-wide roles see every task; everyone else sees tasks tied to a project
 * they're on, plus anything assigned to or created by them directly (so a
 * project-less task they were given still shows up).
 */
export async function listTasks(user: CurrentUserLike, filters: TaskListFilters = {}) {
  const and: Prisma.TaskWhereInput[] = [];

  if (!CAN_VIEW_ORG_WIDE.has(user.role)) {
    const projectIds = await assignedProjectIds(user.id);
    and.push({
      OR: [
        ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : []),
        { assigneeId: user.id },
        { createdById: user.id },
      ],
    });
  }

  if (filters.onlyMine) and.push({ assigneeId: user.id });
  if (filters.overdue) {
    and.push({ status: { not: "COMPLETED" }, dueDate: { lt: new Date() } });
  }
  if (filters.projectId) and.push({ projectId: filters.projectId });
  if (filters.status) and.push({ status: filters.status });
  if (filters.priority) and.push({ priority: filters.priority });
  if (filters.search) {
    and.push({
      OR: [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
      ],
    });
  }

  return prisma.task.findMany({
    where: and.length > 0 ? { AND: and } : {},
    include: {
      project: { select: { id: true, title: true } },
      assignee: { select: { id: true, fullName: true } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });
}

/** Throws ForbiddenError (via requireCanViewTask) if the user can't view it. */
export async function getTaskDetail(user: CurrentUserLike, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: { select: { id: true, title: true } },
      activity: { select: { id: true, title: true } },
      assignee: { select: { id: true, fullName: true, email: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
  });
  if (!task) return null;

  await requireCanViewTask(user, task);
  return task;
}

/** Projects usable in the filter bar — everything this user can *view*, not just manage. */
export async function listFilterableProjects(user: CurrentUserLike) {
  if (CAN_VIEW_ORG_WIDE.has(user.role)) {
    return prisma.project.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });
  }

  const projectIds = await assignedProjectIds(user.id);
  if (projectIds.length === 0) return [];

  return prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}

/** Projects this user has create/manage rights on (per lib/permissions/task-access.ts). */
export async function listTaskableProjects(user: CurrentUserLike) {
  if (user.role === "SYSTEM_ADMIN") {
    return prisma.project.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });
  }

  const [memberships, managed] = await Promise.all([
    prisma.projectMember.findMany({
      where: { userId: user.id, roleInProject: { in: ["MANAGER", "COORDINATOR"] } },
      select: { projectId: true },
    }),
    prisma.project.findMany({ where: { managerId: user.id }, select: { id: true } }),
  ]);
  const ids = Array.from(
    new Set([...memberships.map((m) => m.projectId), ...managed.map((p) => p.id)]),
  );
  if (ids.length === 0) return [];

  return prisma.project.findMany({
    where: { id: { in: ids }, status: { not: "ARCHIVED" } },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}
