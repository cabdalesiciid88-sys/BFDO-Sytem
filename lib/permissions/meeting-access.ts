import "server-only";
import { getProjectRole } from "@/lib/permissions/project-access";
import { ForbiddenError } from "@/lib/permissions/errors";
import { CAN_RECORD_MEETINGS, CAN_VIEW_ORG_WIDE } from "@/lib/permissions/roles";
import type { Role } from "@prisma/client";

export type CurrentUserLike = { id: string; role: Role };

/**
 * Create permission, shared by Meeting and Decision — docs/permissions.md
 * treats "Record meetings/decisions" as one capability. A project-less
 * record is admin-only (no membership to check "own/assigned projects"
 * against for anyone else), same rationale as activity/task creation.
 */
export async function requireCanRecordMeeting(
  user: CurrentUserLike,
  projectId: string | null,
): Promise<void> {
  if (user.role === "SYSTEM_ADMIN") return;
  if (!CAN_RECORD_MEETINGS.has(user.role)) {
    throw new ForbiddenError("You do not have permission to record meetings or decisions.");
  }
  if (!projectId) {
    throw new ForbiddenError("Select a project for this record.");
  }
  const roleInProject = await getProjectRole(user.id, projectId);
  if (!roleInProject) {
    throw new ForbiddenError("You are not assigned to this project.");
  }
}

type MeetingAccessRow = { projectId: string | null; createdById: string };

export async function canViewMeeting(
  user: CurrentUserLike,
  meeting: MeetingAccessRow,
): Promise<boolean> {
  if (CAN_VIEW_ORG_WIDE.has(user.role)) return true;
  if (meeting.createdById === user.id) return true;
  if (meeting.projectId) {
    const roleInProject = await getProjectRole(user.id, meeting.projectId);
    if (roleInProject) return true;
  }
  return false;
}

export async function requireCanViewMeeting(
  user: CurrentUserLike,
  meeting: MeetingAccessRow,
): Promise<void> {
  if (!(await canViewMeeting(user, meeting))) {
    throw new ForbiddenError("You do not have access to this meeting.");
  }
}

export async function canManageMeeting(
  user: CurrentUserLike,
  meeting: MeetingAccessRow,
): Promise<boolean> {
  if (user.role === "SYSTEM_ADMIN") return true;
  if (!meeting.projectId) return meeting.createdById === user.id;
  const roleInProject = await getProjectRole(user.id, meeting.projectId);
  return roleInProject === "MANAGER" || roleInProject === "COORDINATOR";
}

export async function requireCanManageMeeting(
  user: CurrentUserLike,
  meeting: MeetingAccessRow,
): Promise<void> {
  if (!(await canManageMeeting(user, meeting))) {
    throw new ForbiddenError("You do not have permission to edit this meeting.");
  }
}

type DecisionAccessRow = { projectId: string | null; responsibleId: string };

export async function canViewDecision(
  user: CurrentUserLike,
  decision: DecisionAccessRow,
): Promise<boolean> {
  if (CAN_VIEW_ORG_WIDE.has(user.role)) return true;
  if (decision.responsibleId === user.id) return true;
  if (decision.projectId) {
    const roleInProject = await getProjectRole(user.id, decision.projectId);
    if (roleInProject) return true;
  }
  return false;
}

export async function requireCanViewDecision(
  user: CurrentUserLike,
  decision: DecisionAccessRow,
): Promise<void> {
  if (!(await canViewDecision(user, decision))) {
    throw new ForbiddenError("You do not have access to this decision.");
  }
}

export async function canManageDecision(
  user: CurrentUserLike,
  decision: DecisionAccessRow,
): Promise<boolean> {
  if (user.role === "SYSTEM_ADMIN") return true;
  if (!decision.projectId) return decision.responsibleId === user.id;
  const roleInProject = await getProjectRole(user.id, decision.projectId);
  return roleInProject === "MANAGER" || roleInProject === "COORDINATOR";
}

export async function requireCanManageDecision(
  user: CurrentUserLike,
  decision: DecisionAccessRow,
): Promise<void> {
  if (!(await canManageDecision(user, decision))) {
    throw new ForbiddenError("You do not have permission to edit this decision.");
  }
}
