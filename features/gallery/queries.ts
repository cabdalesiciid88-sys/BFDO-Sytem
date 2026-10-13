import "server-only";
import { prisma } from "@/lib/db/client";

export async function listPendingApprovals() {
  return prisma.mediaApproval.findMany({
    where: { status: "PENDING" },
    include: {
      mediaAsset: {
        select: { id: true, originalFilename: true, category: true, thumbnailPath: true },
      },
      submittedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { submittedAt: "asc" },
  });
}

export async function listApprovedApprovals() {
  return prisma.mediaApproval.findMany({
    where: { status: "APPROVED" },
    include: {
      mediaAsset: {
        select: { id: true, originalFilename: true, category: true, thumbnailPath: true },
      },
    },
    orderBy: { reviewedAt: "desc" },
  });
}

/**
 * Public gallery query — the ONLY place in the app allowed to read
 * `media_approvals.status = APPROVED` and must never return internal
 * fields (uploader identity, storage path, project/activity linkage,
 * private description). See docs/permissions.md hard rule 5.
 */
export async function listPublicGalleryItems() {
  const rows = await prisma.mediaApproval.findMany({
    where: { status: "APPROVED" },
    select: {
      mediaAssetId: true,
      publicCaption: true,
      reviewedAt: true,
      mediaAsset: { select: { category: true, mimeType: true } },
    },
    orderBy: { reviewedAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.mediaAssetId,
    caption: row.publicCaption,
    category: row.mediaAsset.category,
    mimeType: row.mediaAsset.mimeType,
    approvedAt: row.reviewedAt,
  }));
}
