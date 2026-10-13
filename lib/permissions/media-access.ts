import "server-only";
import { getProjectRole } from "@/lib/permissions/project-access";
import { ForbiddenError } from "@/lib/permissions/errors";
import { CAN_REVIEW_PUBLIC_MEDIA, CAN_UPLOAD_MEDIA, CAN_VIEW_ORG_WIDE } from "@/lib/permissions/roles";
import type { Role } from "@prisma/client";

export type CurrentUserLike = { id: string; role: Role };

type MediaAccessRow = {
  id: string;
  uploaderId: string;
  projectIds: string[];
};

/** "Upload media (archive)" (docs/permissions.md) — a global role check only;
 *  the file itself has no project until explicitly linked (see below). */
export function requireCanUploadMedia(user: CurrentUserLike): void {
  if (!CAN_UPLOAD_MEDIA.has(user.role)) {
    throw new ForbiddenError("You do not have permission to upload media.");
  }
}

/** Required to link an upload to a specific project — "own/assigned projects". */
export async function requireCanLinkToProject(
  user: CurrentUserLike,
  projectId: string,
): Promise<void> {
  if (user.role === "SYSTEM_ADMIN") return;
  const roleInProject = await getProjectRole(user.id, projectId);
  if (!roleInProject) {
    throw new ForbiddenError("You are not assigned to this project.");
  }
}

/**
 * View/download access: org-wide roles see everything; the uploader always
 * sees their own upload; everyone else needs membership on at least one
 * linked project. Download permission mirrors view permission exactly —
 * docs/permissions.md's "if granted" caveat for TEAM_MEMBER has no separate
 * grant mechanism in this schema, so project membership is the grant.
 */
export async function canViewMedia(
  user: CurrentUserLike,
  media: MediaAccessRow,
): Promise<boolean> {
  if (CAN_VIEW_ORG_WIDE.has(user.role)) return true;
  if (media.uploaderId === user.id) return true;
  if (media.projectIds.length === 0) return false;

  const roles = await Promise.all(media.projectIds.map((id) => getProjectRole(user.id, id)));
  return roles.some((role) => role !== null);
}

export async function requireCanViewMedia(
  user: CurrentUserLike,
  media: MediaAccessRow,
): Promise<void> {
  if (!(await canViewMedia(user, media))) {
    throw new ForbiddenError("You do not have access to this file.");
  }
}

/** "Edit media metadata": admin, the uploader, or the manager of a linked project. */
export async function canEditMediaMetadata(
  user: CurrentUserLike,
  media: MediaAccessRow,
): Promise<boolean> {
  if (user.role === "SYSTEM_ADMIN") return true;
  if (media.uploaderId === user.id) return true;

  const roles = await Promise.all(media.projectIds.map((id) => getProjectRole(user.id, id)));
  return roles.some((role) => role === "MANAGER");
}

export async function requireCanEditMediaMetadata(
  user: CurrentUserLike,
  media: MediaAccessRow,
): Promise<void> {
  if (!(await canEditMediaMetadata(user, media))) {
    throw new ForbiddenError("You do not have permission to edit this file's details.");
  }
}

/**
 * "Submit media for public approval": same role set as upload
 * (CAN_UPLOAD_MEDIA) — hard rule 1 means this never implies the separate
 * approve/reject/revoke capability below — plus they must already have
 * view access to the specific asset.
 */
export async function requireCanSubmitForApproval(
  user: CurrentUserLike,
  media: MediaAccessRow,
): Promise<void> {
  if (!CAN_UPLOAD_MEDIA.has(user.role)) {
    throw new ForbiddenError("You do not have permission to submit media for the public gallery.");
  }
  await requireCanViewMedia(user, media);
}

/** "Approve/reject/revoke public media" — org-wide, deliberately excludes uploaders. */
export function requireCanReviewPublicMedia(user: CurrentUserLike): void {
  if (!CAN_REVIEW_PUBLIC_MEDIA.has(user.role)) {
    throw new ForbiddenError("You do not have permission to review public gallery submissions.");
  }
}
