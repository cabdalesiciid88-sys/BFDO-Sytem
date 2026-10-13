import "server-only";
import { prisma } from "@/lib/db/client";
import { ForbiddenError } from "@/lib/permissions/errors";
import { getProjectRole } from "@/lib/permissions/project-access";
import { CAN_CREATE_ACTIVITY, CAN_VIEW_ORG_WIDE } from "@/lib/permissions/roles";
import type { Role } from "@prisma/client";

export type CurrentUserLike = { id: string; role: Role };

type ActivityAccessRow = {
  id: string;
  projectId: string | null;
  createdById: string;
  responsibleId: string;
};

async function isParticipant(userId: string, activityId: string): Promise<boolean> {
  const row = await prisma.activityParticipant.findUnique({
    where: { activityId_userId: { activityId, userId } },
    select: { id: true },
  });
  return !!row;
}

/**
 * View access: org-wide roles see everything; everyone else sees activities
 * tied to a project they're on, activities they created or are responsible
 * for, or activities they participated in — even if that activity has no
 * project (docs/permissions.md "View activity").
 */
export async function canViewActivity(
  user: CurrentUserLike,
  activity: ActivityAccessRow,
): Promise<boolean> {
  if (CAN_VIEW_ORG_WIDE.has(user.role)) return true;
  if (activity.createdById === user.id || activity.responsibleId === user.id) return true;
  if (activity.projectId) {
    const roleInProject = await getProjectRole(user.id, activity.projectId);
    if (roleInProject) return true;
  }
  return isParticipant(user.id, activity.id);
}

export async function requireActivityAccess(
  user: CurrentUserLike,
  activity: ActivityAccessRow,
): Promise<void> {
  if (!(await canViewActivity(user, activity))) {
    throw new ForbiddenError("You do not have access to this activity.");
  }
}

/**
 * Create permission. An activity with no project is admin-only (there is no
 * project membership to check "own/assigned projects" against for anyone
 * else) — PROJECT_MANAGER/COORDINATOR must pick one of their own projects.
 */
export async function requireCanCreateActivity(
  user: CurrentUserLike,
  projectId: string | null,
): Promise<void> {
  if (user.role === "SYSTEM_ADMIN") return;
  if (!CAN_CREATE_ACTIVITY.has(user.role)) {
    throw new ForbiddenError("You do not have permission to create activities.");
  }
  if (!projectId) {
    throw new ForbiddenError("Select a project for this activity.");
  }
  const roleInProject = await getProjectRole(user.id, projectId);
  if (!roleInProject) {
    throw new ForbiddenError("You are not assigned to this project.");
  }
}

/**
 * Edit permission: the project MANAGER can edit any activity in their
 * project; a COORDINATOR/MEMBER on the project can only edit entries they
 * authored or are responsible for (docs/permissions.md "Edit activity").
 */
export async function canEditActivity(
  user: CurrentUserLike,
  activity: ActivityAccessRow,
): Promise<boolean> {
  if (user.role === "SYSTEM_ADMIN") return true;
  if (!activity.projectId) {
    return activity.createdById === user.id || activity.responsibleId === user.id;
  }
  const roleInProject = await getProjectRole(user.id, activity.projectId);
  if (roleInProject === "MANAGER") return true;
  if (roleInProject === "COORDINATOR" || roleInProject === "MEMBER") {
    return activity.createdById === user.id || activity.responsibleId === user.id;
  }
  return false;
}

export async function requireCanEditActivity(
  user: CurrentUserLike,
  activity: ActivityAccessRow,
): Promise<void> {
  if (!(await canEditActivity(user, activity))) {
    throw new ForbiddenError("You do not have permission to edit this activity.");
  }
}
