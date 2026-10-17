import "server-only";
import { prisma } from "@/lib/db/client";
import { CAN_VIEW_ORG_WIDE } from "@/lib/permissions/roles";
import { assignedProjectIds } from "@/lib/permissions/project-access";
import type { Prisma, Role } from "@prisma/client";

export type CurrentUserLike = { id: string; role: Role };

/**
 * "View dashboard metrics" (docs/permissions.md): org-wide roles see
 * everything; everyone else sees only their assigned projects, plus
 * anything they personally created/are responsible for/are assigned to.
 */
export async function getDashboardMetrics(user: CurrentUserLike) {
  const orgWide = CAN_VIEW_ORG_WIDE.has(user.role);
  const projectIds = orgWide ? [] : await assignedProjectIds(user.id);
  const hasProjects = projectIds.length > 0;

  const projectWhere: Prisma.ProjectWhereInput = orgWide
    ? {}
    : { id: { in: hasProjects ? projectIds : ["__none__"] } };

  const activityWhere: Prisma.ActivityWhereInput = orgWide
    ? {}
    : {
        OR: [
          ...(hasProjects ? [{ projectId: { in: projectIds } }] : []),
          { createdById: user.id },
          { responsibleId: user.id },
          { participants: { some: { userId: user.id } } },
        ],
      };

  const taskWhere: Prisma.TaskWhereInput = orgWide
    ? {}
    : {
        OR: [
          ...(hasProjects ? [{ projectId: { in: projectIds } }] : []),
          { assigneeId: user.id },
          { createdById: user.id },
        ],
      };

  const meetingWhere: Prisma.MeetingWhereInput = orgWide
    ? {}
    : {
        OR: [
          ...(hasProjects ? [{ projectId: { in: projectIds } }] : []),
          { createdById: user.id },
          { participants: { some: { userId: user.id } } },
        ],
      };

  const decisionWhere: Prisma.DecisionWhereInput = orgWide
    ? {}
    : {
        OR: [
          ...(hasProjects ? [{ projectId: { in: projectIds } }] : []),
          { responsibleId: user.id },
        ],
      };

  const now = new Date();

  const [
    projectsByStatus,
    activityCount,
    tasksByStatus,
    overdueTaskCount,
    myOpenTaskCount,
    upcomingMeetings,
    openDecisionCount,
    totalDecisionCount,
  ] = await Promise.all([
    prisma.project.groupBy({ by: ["status"], where: projectWhere, _count: true }),
    prisma.activity.count({ where: activityWhere }),
    prisma.task.groupBy({ by: ["status"], where: taskWhere, _count: true }),
    prisma.task.count({
      where: { ...taskWhere, status: { not: "COMPLETED" }, dueDate: { lt: now } },
    }),
    prisma.task.count({ where: { assigneeId: user.id, status: { not: "COMPLETED" } } }),
    prisma.meeting.findMany({
      where: { ...meetingWhere, heldAt: { gte: now } },
      select: {
        id: true,
        title: true,
        heldAt: true,
        project: { select: { title: true } },
      },
      orderBy: { heldAt: "asc" },
      take: 5,
    }),
    prisma.decision.count({
      where: { ...decisionWhere, status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    prisma.decision.count({ where: decisionWhere }),
  ]);

  return {
    projectsByStatus: Object.fromEntries(projectsByStatus.map((p) => [p.status, p._count])),
    activityCount,
    tasksByStatus: Object.fromEntries(tasksByStatus.map((t) => [t.status, t._count])),
    overdueTaskCount,
    myOpenTaskCount,
    upcomingMeetings,
    openDecisionCount,
    totalDecisionCount,
  };
}

/** Lightweight preview for the dashboard's right-panel "Team" widget. */
export async function getTeamPreview(limit = 5) {
  return prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, fullName: true, role: true },
    orderBy: { lastLoginAt: "desc" },
    take: limit,
  });
}
