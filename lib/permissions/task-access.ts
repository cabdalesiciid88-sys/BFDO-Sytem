import "server-only";
import { getProjectRole } from "@/lib/permissions/project-access";
import { ForbiddenError } from "@/lib/permissions/errors";
import { CAN_CREATE_TASK, CAN_VIEW_ORG_WIDE } from "@/lib/permissions/roles";
import type { Role } from "@prisma/client";

export type CurrentUserLike = { id: string; role: Role };

type TaskAccessRow = {
  id: string;
  projectId: string | null;
  assigneeId: string | null;
  createdById: string;
};

/** Full manage rights (reassign, retitle, reprioritize, etc). */
export async function canManageTask(
  user: CurrentUserLike,
  task: TaskAccessRow,
): Promise<boolean> {
  if (user.role === "SYSTEM_ADMIN") return true;
  if (!task.projectId) return false;
  const roleInProject = await getProjectRole(user.id, task.projectId);
  return roleInProject === "MANAGER" || roleInProject === "COORDINATOR";
}

export async function requireCanManageTask(
  user: CurrentUserLike,
  task: TaskAccessRow,
): Promise<void> {
  if (!(await canManageTask(user, task))) {
    throw new ForbiddenError("You do not have permission to manage this task.");
  }
}

/**
 * Create permission, checked against the *target* project rather than an
 * existing row. A task with no project is admin-only, same rationale as
 * lib/permissions/activity-access.ts.
 */
export async function requireCanCreateTaskInProject(
  user: CurrentUserLike,
  projectId: string | null,
): Promise<void> {
  if (user.role === "SYSTEM_ADMIN") return;
  if (!CAN_CREATE_TASK.has(user.role)) {
    throw new ForbiddenError("You do not have permission to create tasks.");
  }
  if (!projectId) {
    throw new ForbiddenError("Select a project for this task.");
  }
  const roleInProject = await getProjectRole(user.id, projectId);
  if (roleInProject !== "MANAGER" && roleInProject !== "COORDINATOR") {
    throw new ForbiddenError("You are not a manager or coordinator on this project.");
  }
}

export async function canViewTask(user: CurrentUserLike, task: TaskAccessRow): Promise<boolean> {
  if (CAN_VIEW_ORG_WIDE.has(user.role)) return true;
  if (task.assigneeId === user.id || task.createdById === user.id) return true;
  if (task.projectId) {
    const roleInProject = await getProjectRole(user.id, task.projectId);
    if (roleInProject) return true;
  }
  return false;
}

export async function requireCanViewTask(
  user: CurrentUserLike,
  task: TaskAccessRow,
): Promise<void> {
  if (!(await canViewTask(user, task))) {
    throw new ForbiddenError("You do not have access to this task.");
  }
}

/** "Complete own assigned task" (docs/permissions.md) — every role, including TEAM_MEMBER. */
export async function canUpdateTaskStatus(
  user: CurrentUserLike,
  task: TaskAccessRow,
): Promise<boolean> {
  if (task.assigneeId === user.id) return true;
  return canManageTask(user, task);
}

export async function requireCanUpdateTaskStatus(
  user: CurrentUserLike,
  task: TaskAccessRow,
): Promise<void> {
  if (!(await canUpdateTaskStatus(user, task))) {
    throw new ForbiddenError("You do not have permission to update this task.");
  }
}
