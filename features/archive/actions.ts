"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/current-user";
import { ForbiddenError } from "@/lib/permissions/errors";
import {
  requireCanEditMediaMetadata,
  requireCanLinkToProject,
  requireCanSubmitForApproval,
  requireCanUploadMedia,
} from "@/lib/permissions/media-access";
import { canViewActivity } from "@/lib/permissions/activity-access";
import { recordAuditLog } from "@/lib/audit/log";
import { generateStoragePath, thumbnailPathFor } from "@/lib/storage/paths";
import { writeStorageFile } from "@/lib/storage/file-io";
import { validateUpload } from "@/lib/storage/validate-upload";
import { generateThumbnail } from "@/lib/storage/thumbnail";
import { updateMediaSchema, uploadMediaSchema } from "@/features/archive/schema";

export type MediaFormState = { error: string } | null;

export async function uploadMedia(
  _prevState: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const user = await requireUser();

  try {
    requireCanUploadMedia(user);
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message };
    throw err;
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Select a file to upload." };
  }

  const parsed = uploadMediaSchema.safeParse({
    category: formData.get("category"),
    description: formData.get("description"),
    keywords: formData.get("keywords"),
    projectId: formData.get("projectId"),
    activityId: formData.get("activityId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  if (parsed.data.projectId) {
    try {
      await requireCanLinkToProject(user, parsed.data.projectId);
    } catch (err) {
      if (err instanceof ForbiddenError) return { error: err.message };
      throw err;
    }
  }

  if (parsed.data.activityId) {
    const activity = await prisma.activity.findUnique({
      where: { id: parsed.data.activityId },
      select: { id: true, projectId: true, createdById: true, responsibleId: true },
    });
    if (!activity) return { error: "Selected activity does not exist." };
    if (!(await canViewActivity(user, activity))) {
      return { error: "You do not have access to the selected activity." };
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = await validateUpload(buffer, parsed.data.category);
  if (!validation.ok) return { error: validation.error };

  const storagePath = generateStoragePath(validation.extension);
  await writeStorageFile(storagePath, buffer);

  let thumbnailPath: string | null = null;
  if (parsed.data.category === "PHOTO") {
    try {
      const thumbnailBuffer = await generateThumbnail(buffer);
      thumbnailPath = thumbnailPathFor(storagePath);
      await writeStorageFile(thumbnailPath, thumbnailBuffer);
    } catch {
      // Thumbnail generation failing (unusual/corrupt image data) shouldn't
      // block the upload — the original is already safely stored.
      thumbnailPath = null;
    }
  }

  const checksumSha256 = createHash("sha256").update(buffer).digest("hex");

  const media = await prisma.mediaAsset.create({
    data: {
      originalFilename: file.name.slice(0, 255),
      storagePath,
      thumbnailPath,
      mimeType: validation.mimeType,
      fileSizeBytes: buffer.byteLength,
      category: parsed.data.category,
      description: parsed.data.description ?? null,
      keywords: parsed.data.keywords ?? null,
      checksumSha256,
      uploaderId: user.id,
      projectMedia: parsed.data.projectId
        ? { create: { projectId: parsed.data.projectId } }
        : undefined,
      activityMedia: parsed.data.activityId
        ? { create: { activityId: parsed.data.activityId } }
        : undefined,
    },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "media.upload",
    targetType: "MediaAsset",
    targetId: media.id,
    afterValue: { originalFilename: media.originalFilename, category: media.category },
  });

  revalidatePath("/archive");
  redirect(`/archive/${media.id}`);
}

export async function updateMediaMetadata(
  mediaId: string,
  _prevState: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const user = await requireUser();

  const existing = await prisma.mediaAsset.findUnique({
    where: { id: mediaId },
    include: { projectMedia: { select: { projectId: true } } },
  });
  if (!existing) return { error: "File not found." };

  try {
    await requireCanEditMediaMetadata(user, {
      id: existing.id,
      uploaderId: existing.uploaderId,
      projectIds: existing.projectMedia.map((pm) => pm.projectId),
    });
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message };
    throw err;
  }

  const parsed = updateMediaSchema.safeParse({
    description: formData.get("description"),
    keywords: formData.get("keywords"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  await prisma.mediaAsset.update({
    where: { id: mediaId },
    data: {
      description: parsed.data.description ?? null,
      keywords: parsed.data.keywords ?? null,
    },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "media.update",
    targetType: "MediaAsset",
    targetId: mediaId,
  });

  revalidatePath(`/archive/${mediaId}`);
  redirect(`/archive/${mediaId}`);
}

export async function submitMediaForApproval(mediaId: string): Promise<void> {
  const user = await requireUser();

  const existing = await prisma.mediaAsset.findUnique({
    where: { id: mediaId },
    include: { projectMedia: { select: { projectId: true } }, approval: true },
  });
  if (!existing) throw new Error("File not found.");

  await requireCanSubmitForApproval(user, {
    id: existing.id,
    uploaderId: existing.uploaderId,
    projectIds: existing.projectMedia.map((pm) => pm.projectId),
  });

  if (existing.approval && existing.approval.status !== "REJECTED") {
    throw new Error("This file has already been submitted or is already public.");
  }

  await prisma.mediaApproval.upsert({
    where: { mediaAssetId: mediaId },
    create: { mediaAssetId: mediaId, submittedById: user.id },
    update: {
      status: "PENDING",
      submittedById: user.id,
      submittedAt: new Date(),
      reviewedById: null,
      reviewedAt: null,
      rejectionReason: null,
    },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "media.submit_for_approval",
    targetType: "MediaAsset",
    targetId: mediaId,
  });

  revalidatePath(`/archive/${mediaId}`);
  revalidatePath("/archive/review");
}
