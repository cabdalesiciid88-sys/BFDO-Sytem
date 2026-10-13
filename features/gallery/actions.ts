"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/current-user";
import { requireCanReviewPublicMedia } from "@/lib/permissions/media-access";
import { recordAuditLog } from "@/lib/audit/log";

function textFromFormData(formData: FormData, field: string): string | null {
  const raw = formData.get(field);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 2000) : null;
}

export async function approveMedia(mediaId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  requireCanReviewPublicMedia(user);

  const approval = await prisma.mediaApproval.findUnique({ where: { mediaAssetId: mediaId } });
  if (!approval) throw new Error("No submission found for this file.");

  await prisma.mediaApproval.update({
    where: { mediaAssetId: mediaId },
    data: {
      status: "APPROVED",
      reviewedById: user.id,
      reviewedAt: new Date(),
      publicCaption: textFromFormData(formData, "publicCaption"),
      rejectionReason: null,
      revokedAt: null,
    },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "media.approve",
    targetType: "MediaAsset",
    targetId: mediaId,
  });

  revalidatePath("/archive/review");
  revalidatePath("/gallery");
}

export async function rejectMedia(mediaId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  requireCanReviewPublicMedia(user);

  const approval = await prisma.mediaApproval.findUnique({ where: { mediaAssetId: mediaId } });
  if (!approval) throw new Error("No submission found for this file.");

  await prisma.mediaApproval.update({
    where: { mediaAssetId: mediaId },
    data: {
      status: "REJECTED",
      reviewedById: user.id,
      reviewedAt: new Date(),
      rejectionReason: textFromFormData(formData, "rejectionReason"),
      publicCaption: null,
    },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "media.reject",
    targetType: "MediaAsset",
    targetId: mediaId,
  });

  revalidatePath("/archive/review");
}

export async function revokeMedia(mediaId: string): Promise<void> {
  const user = await requireUser();
  requireCanReviewPublicMedia(user);

  const approval = await prisma.mediaApproval.findUnique({ where: { mediaAssetId: mediaId } });
  if (!approval || approval.status !== "APPROVED") {
    throw new Error("This file is not currently public.");
  }

  await prisma.mediaApproval.update({
    where: { mediaAssetId: mediaId },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "media.revoke",
    targetType: "MediaAsset",
    targetId: mediaId,
  });

  revalidatePath("/archive/review");
  revalidatePath("/gallery");
}
