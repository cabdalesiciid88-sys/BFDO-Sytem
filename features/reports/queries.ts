import "server-only";
import { prisma } from "@/lib/db/client";
import { ForbiddenError } from "@/lib/permissions/errors";
import { CAN_VIEW_ORG_WIDE } from "@/lib/permissions/roles";
import { assignedProjectIds } from "@/lib/permissions/project-access";
import type { ApprovalStatus, MediaCategory, Prisma, Role } from "@prisma/client";

export type CurrentUserLike = { id: string; role: Role };

export type ReportDateRange = { from?: Date; to?: Date; projectId?: string };

/** Inclusive of the whole `to` day, since filter inputs are date-only. */
function dateRangeWhere(from?: Date, to?: Date): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  const where: Prisma.DateTimeFilter = {};
  if (from) where.gte = from;
  if (to) where.lt = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1);
  return where;
}

/** Projects a user may select in a report filter — includes archived
 *  projects, unlike listCreatableProjects, since historical reports should
 *  still be able to scope to a since-archived project. */
export async function listReportableProjects(user: CurrentUserLike) {
  if (CAN_VIEW_ORG_WIDE.has(user.role)) {
    return prisma.project.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } });
  }
  const projectIds = await assignedProjectIds(user.id);
  if (projectIds.length === 0) return [];
  return prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}

export type ActivitiesReportFilters = ReportDateRange & { category?: string };

/** Mirrors features/activities/queries.ts's listActivities scoping. */
export async function getActivitiesReport(user: CurrentUserLike, filters: ActivitiesReportFilters) {
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

  const activityDate = dateRangeWhere(filters.from, filters.to);
  if (activityDate) and.push({ activityDate });
  if (filters.projectId) and.push({ projectId: filters.projectId });
  if (filters.category) and.push({ category: filters.category });

  const rows = await prisma.activity.findMany({
    where: and.length > 0 ? { AND: and } : {},
    include: {
      project: { select: { title: true } },
      responsible: { select: { fullName: true } },
    },
    orderBy: { activityDate: "desc" },
  });

  const summaryByCategory = new Map<string, number>();
  for (const row of rows) {
    const key = row.category ?? "Uncategorized";
    summaryByCategory.set(key, (summaryByCategory.get(key) ?? 0) + 1);
  }

  return { rows, summaryByCategory };
}

export type TaskStatusReportFilters = { projectId?: string };

/** Mirrors features/tasks/queries.ts's listTasks scoping. */
export async function getTaskStatusReport(user: CurrentUserLike, filters: TaskStatusReportFilters) {
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

  if (filters.projectId) and.push({ projectId: filters.projectId });

  const rows = await prisma.task.findMany({
    where: and.length > 0 ? { AND: and } : {},
    include: {
      project: { select: { title: true } },
      assignee: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const summaryByStatus = new Map<string, number>();
  for (const row of rows) {
    summaryByStatus.set(row.status, (summaryByStatus.get(row.status) ?? 0) + 1);
  }

  return { rows, summaryByStatus };
}

export type ArchiveReportFilters = ReportDateRange & { category?: MediaCategory };

/** Mirrors features/archive/queries.ts's listMedia scoping. */
export async function getArchiveUploadsReport(user: CurrentUserLike, filters: ArchiveReportFilters) {
  const and: Prisma.MediaAssetWhereInput[] = [{ status: "ACTIVE" }];

  if (!CAN_VIEW_ORG_WIDE.has(user.role)) {
    const projectIds = await assignedProjectIds(user.id);
    and.push({
      OR: [
        { uploaderId: user.id },
        ...(projectIds.length > 0
          ? [{ projectMedia: { some: { projectId: { in: projectIds } } } }]
          : []),
      ],
    });
  }

  const uploadedAt = dateRangeWhere(filters.from, filters.to);
  if (uploadedAt) and.push({ uploadedAt });
  if (filters.projectId) and.push({ projectMedia: { some: { projectId: filters.projectId } } });
  if (filters.category) and.push({ category: filters.category });

  const rows = await prisma.mediaAsset.findMany({
    where: { AND: and },
    include: {
      uploader: { select: { fullName: true } },
      projectMedia: { include: { project: { select: { title: true } } } },
    },
    orderBy: { uploadedAt: "desc" },
  });

  const summaryByCategory = new Map<string, number>();
  for (const row of rows) {
    summaryByCategory.set(row.category, (summaryByCategory.get(row.category) ?? 0) + 1);
  }

  return { rows, summaryByCategory };
}

export type GalleryReportFilters = ReportDateRange & { status?: ApprovalStatus };

/**
 * Gallery Approvals report is narrower than the other three: the public
 * gallery approve/reject/revoke workflow itself is admin/leadership-only
 * (docs/permissions.md), so viewing its history is gated to
 * CAN_VIEW_ORG_WIDE rather than the broader CAN_VIEW_REPORTS — a Project
 * Manager can see their own activities/tasks/uploads but not who reviewed
 * what across the whole org. Caller must still re-check this; it is not
 * implied by CAN_VIEW_REPORTS alone.
 */
export async function getGalleryApprovalsReport(user: CurrentUserLike, filters: GalleryReportFilters) {
  if (!CAN_VIEW_ORG_WIDE.has(user.role)) {
    throw new ForbiddenError("Only Admin and Leadership can view the gallery approvals report.");
  }

  const and: Prisma.MediaApprovalWhereInput[] = [];
  const submittedAt = dateRangeWhere(filters.from, filters.to);
  if (submittedAt) and.push({ submittedAt });
  if (filters.status) and.push({ status: filters.status });

  const rows = await prisma.mediaApproval.findMany({
    where: and.length > 0 ? { AND: and } : {},
    include: {
      mediaAsset: { select: { originalFilename: true, category: true } },
      submittedBy: { select: { fullName: true } },
      reviewedBy: { select: { fullName: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  const summaryByStatus = new Map<string, number>();
  for (const row of rows) {
    summaryByStatus.set(row.status, (summaryByStatus.get(row.status) ?? 0) + 1);
  }

  return { rows, summaryByStatus };
}
