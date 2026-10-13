import "server-only";
import { prisma } from "@/lib/db/client";
import { CAN_VIEW_ORG_WIDE } from "@/lib/permissions/roles";
import { assignedProjectIds } from "@/lib/permissions/project-access";
import { requireCanViewMeeting } from "@/lib/permissions/meeting-access";
import type { Prisma, Role } from "@prisma/client";

export type CurrentUserLike = { id: string; role: Role };

export type MeetingListFilters = { search?: string; projectId?: string };

export async function listMeetings(user: CurrentUserLike, filters: MeetingListFilters = {}) {
  const and: Prisma.MeetingWhereInput[] = [];

  if (!CAN_VIEW_ORG_WIDE.has(user.role)) {
    const projectIds = await assignedProjectIds(user.id);
    and.push({
      OR: [
        ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : []),
        { createdById: user.id },
        { participants: { some: { userId: user.id } } },
      ],
    });
  }

  if (filters.projectId) and.push({ projectId: filters.projectId });
  if (filters.search) {
    and.push({
      OR: [
        { title: { contains: filters.search } },
        { location: { contains: filters.search } },
      ],
    });
  }

  return prisma.meeting.findMany({
    where: and.length > 0 ? { AND: and } : {},
    include: {
      project: { select: { id: true, title: true } },
      _count: { select: { participants: true, decisions: true } },
    },
    orderBy: { heldAt: "desc" },
  });
}

/** Throws ForbiddenError (via requireCanViewMeeting) if the user can't view it. */
export async function getMeetingDetail(user: CurrentUserLike, meetingId: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      project: { select: { id: true, title: true } },
      createdBy: { select: { id: true, fullName: true } },
      participants: {
        include: { user: { select: { id: true, fullName: true, email: true } } },
      },
      decisions: {
        include: { responsible: { select: { id: true, fullName: true } } },
        orderBy: { decidedAt: "desc" },
      },
    },
  });
  if (!meeting) return null;

  await requireCanViewMeeting(user, meeting);
  return meeting;
}

/** Projects this user may record a meeting under (membership, or all for admin). */
export async function listMeetableProjects(user: CurrentUserLike) {
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
