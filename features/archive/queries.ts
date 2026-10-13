import "server-only";
import { prisma } from "@/lib/db/client";
import { CAN_VIEW_ORG_WIDE } from "@/lib/permissions/roles";
import { assignedProjectIds } from "@/lib/permissions/project-access";
import { requireCanViewMedia } from "@/lib/permissions/media-access";
import type { MediaCategory, Prisma, Role } from "@prisma/client";

export type CurrentUserLike = { id: string; role: Role };

export type MediaListFilters = {
  search?: string;
  category?: MediaCategory;
  projectId?: string;
};

/**
 * Org-wide roles see every active file; everyone else sees their own
 * uploads plus anything linked to a project they're assigned to — mirrors
 * lib/permissions/media-access.ts's canViewMedia rule.
 */
export async function listMedia(user: CurrentUserLike, filters: MediaListFilters = {}) {
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

  if (filters.category) and.push({ category: filters.category });
  if (filters.projectId) and.push({ projectMedia: { some: { projectId: filters.projectId } } });
  if (filters.search) {
    and.push({
      OR: [
        { originalFilename: { contains: filters.search } },
        { description: { contains: filters.search } },
        { keywords: { contains: filters.search } },
      ],
    });
  }

  return prisma.mediaAsset.findMany({
    where: { AND: and },
    include: {
      uploader: { select: { id: true, fullName: true } },
      projectMedia: { include: { project: { select: { id: true, title: true } } } },
      approval: { select: { status: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });
}

/** Throws ForbiddenError (via requireCanViewMedia) if the user can't view it. */
export async function getMediaDetail(user: CurrentUserLike, mediaId: string) {
  const media = await prisma.mediaAsset.findUnique({
    where: { id: mediaId },
    include: {
      uploader: { select: { id: true, fullName: true, email: true } },
      projectMedia: { include: { project: { select: { id: true, title: true } } } },
      activityMedia: { include: { activity: { select: { id: true, title: true } } } },
      approval: true,
    },
  });
  if (!media) return null;

  await requireCanViewMedia(user, {
    id: media.id,
    uploaderId: media.uploaderId,
    projectIds: media.projectMedia.map((pm) => pm.projectId),
  });

  return media;
}

export async function listLinkableProjects(user: CurrentUserLike) {
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

/** Flat list, not filtered by a selected project — the upload form doesn't
 *  have client-side reactivity to narrow it, and access is re-checked
 *  server-side regardless (see features/archive/actions.ts). */
export async function listLinkableActivities(user: CurrentUserLike) {
  if (CAN_VIEW_ORG_WIDE.has(user.role)) {
    return prisma.activity.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, title: true },
      orderBy: { activityDate: "desc" },
      take: 200,
    });
  }

  const projectIds = await assignedProjectIds(user.id);
  return prisma.activity.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : []),
        { createdById: user.id },
        { responsibleId: user.id },
      ],
    },
    select: { id: true, title: true },
    orderBy: { activityDate: "desc" },
    take: 200,
  });
}
