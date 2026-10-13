import "server-only";
import { prisma } from "@/lib/db/client";
import { ForbiddenError } from "@/lib/permissions/errors";
import { CAN_VIEW_ORG_WIDE } from "@/lib/permissions/roles";
import type { ProjectMemberRole, Role } from "@prisma/client";

export type CurrentUserLike = { id: string; role: Role };

/**
 * Returns the user's membership role on a project, or null if they aren't
 * on it. Checks both `project_members` and `projects.managerId` (a project's
 * manager is always expected to also have a project_members row created
 * alongside the project, but this is a deliberate defense-in-depth
 * fallback given there is no database-level RLS backstop here).
 */
export async function getProjectRole(
  userId: string,
  projectId: string,
): Promise<ProjectMemberRole | null> {
  const [membership, project] = await Promise.all([
    prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { roleInProject: true },
    }),
    prisma.project.findUnique({
      where: { id: projectId },
      select: { managerId: true },
    }),
  ]);

  if (membership) return membership.roleInProject;
  if (project?.managerId === userId) return "MANAGER";
  return null;
}

/**
 * Throws ForbiddenError unless the user is SYSTEM_ADMIN/LEADERSHIP
 * (org-wide view access) or has a membership row on this specific project.
 * Call this before reading or writing any project-scoped record
 * (activities, tasks, meetings, media, etc).
 */
export async function requireProjectAccess(
  user: CurrentUserLike,
  projectId: string,
): Promise<ProjectMemberRole | "ORG_WIDE"> {
  if (CAN_VIEW_ORG_WIDE.has(user.role)) return "ORG_WIDE";

  const roleInProject = await getProjectRole(user.id, projectId);
  if (!roleInProject) {
    throw new ForbiddenError("You are not assigned to this project.");
  }
  return roleInProject;
}

/**
 * Throws ForbiddenError unless the user is SYSTEM_ADMIN or is specifically
 * the MANAGER of this project. Deliberately narrower than
 * requireProjectAccess — LEADERSHIP has org-wide *view* access but no
 * edit/archive/member-management rights (docs/permissions.md matrix), so it
 * must not be granted here.
 */
export async function requireProjectManager(
  user: CurrentUserLike,
  projectId: string,
): Promise<void> {
  if (user.role === "SYSTEM_ADMIN") return;

  const roleInProject = await getProjectRole(user.id, projectId);
  if (roleInProject !== "MANAGER") {
    throw new ForbiddenError("Only the project manager or an admin can do that.");
  }
}

/** Returns the set of project IDs a non-org-wide user is assigned to. */
export async function assignedProjectIds(userId: string): Promise<string[]> {
  const [memberships, managed] = await Promise.all([
    prisma.projectMember.findMany({ where: { userId }, select: { projectId: true } }),
    prisma.project.findMany({ where: { managerId: userId }, select: { id: true } }),
  ]);

  return Array.from(
    new Set([...memberships.map((m) => m.projectId), ...managed.map((p) => p.id)]),
  );
}
