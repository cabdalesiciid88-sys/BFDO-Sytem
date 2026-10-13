"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/current-user";
import { ForbiddenError } from "@/lib/permissions/errors";
import {
  requireCanCreateActivity,
  requireCanEditActivity,
} from "@/lib/permissions/activity-access";
import { recordAuditLog } from "@/lib/audit/log";
import { generateReferenceCode } from "@/lib/validation/reference-code";
import { createActivitySchema, updateActivitySchema } from "@/features/activities/schema";

export type ActivityFormState = { error: string } | null;

async function uniqueActivityReferenceCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferenceCode("ACT");
    const existing = await prisma.activity.findUnique({ where: { referenceCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique activity reference code.");
}

function fieldsFromFormData(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    location: formData.get("location"),
    activityDate: formData.get("activityDate"),
    projectId: formData.get("projectId"),
    responsibleId: formData.get("responsibleId"),
    outcomes: formData.get("outcomes"),
  };
}

async function validResponsibleId(responsibleId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: responsibleId },
    select: { id: true, status: true },
  });
  return user && user.status === "ACTIVE" ? user.id : null;
}

function uniqueParticipantIds(formData: FormData): string[] {
  return Array.from(new Set(formData.getAll("participantIds").map(String).filter(Boolean)));
}

export async function createActivity(
  _prevState: ActivityFormState,
  formData: FormData,
): Promise<ActivityFormState> {
  const user = await requireUser();

  const parsed = createActivitySchema.safeParse(fieldsFromFormData(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  try {
    await requireCanCreateActivity(user, parsed.data.projectId ?? null);
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message };
    throw err;
  }

  const responsibleId = await validResponsibleId(parsed.data.responsibleId);
  if (!responsibleId) {
    return { error: "Selected responsible person is not a valid active user." };
  }

  const referenceCode = await uniqueActivityReferenceCode();

  const activity = await prisma.activity.create({
    data: {
      referenceCode,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      category: parsed.data.category ?? null,
      location: parsed.data.location ?? null,
      activityDate: new Date(parsed.data.activityDate),
      projectId: parsed.data.projectId ?? null,
      responsibleId,
      outcomes: parsed.data.outcomes ?? null,
      createdById: user.id,
      participants: {
        create: uniqueParticipantIds(formData).map((userId) => ({ userId })),
      },
    },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "activity.create",
    targetType: "Activity",
    targetId: activity.id,
    afterValue: { title: activity.title, referenceCode: activity.referenceCode },
  });

  revalidatePath("/activities");
  redirect(`/activities/${activity.id}`);
}

export async function updateActivity(
  activityId: string,
  _prevState: ActivityFormState,
  formData: FormData,
): Promise<ActivityFormState> {
  const user = await requireUser();

  const existing = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!existing) return { error: "Activity not found." };

  try {
    await requireCanEditActivity(user, existing);
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message };
    throw err;
  }

  const parsed = updateActivitySchema.safeParse({
    ...fieldsFromFormData(formData),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  const nextProjectId = parsed.data.projectId ?? null;
  if (nextProjectId !== existing.projectId) {
    try {
      await requireCanCreateActivity(user, nextProjectId);
    } catch (err) {
      if (err instanceof ForbiddenError) return { error: err.message };
      throw err;
    }
  }

  const responsibleId = await validResponsibleId(parsed.data.responsibleId);
  if (!responsibleId) {
    return { error: "Selected responsible person is not a valid active user." };
  }

  const participantIds = uniqueParticipantIds(formData);

  await prisma.$transaction([
    prisma.activityParticipant.deleteMany({ where: { activityId } }),
    prisma.activity.update({
      where: { id: activityId },
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        category: parsed.data.category ?? null,
        location: parsed.data.location ?? null,
        activityDate: new Date(parsed.data.activityDate),
        projectId: nextProjectId,
        responsibleId,
        outcomes: parsed.data.outcomes ?? null,
        status: parsed.data.status,
        participants: { create: participantIds.map((userId) => ({ userId })) },
      },
    }),
  ]);

  await recordAuditLog({
    actorId: user.id,
    action: "activity.update",
    targetType: "Activity",
    targetId: activityId,
    beforeValue: { title: existing.title, status: existing.status },
    afterValue: { title: parsed.data.title, status: parsed.data.status },
  });

  revalidatePath(`/activities/${activityId}`);
  revalidatePath("/activities");
  redirect(`/activities/${activityId}`);
}

export async function archiveActivity(activityId: string): Promise<void> {
  const user = await requireUser();
  const existing = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!existing) throw new Error("Activity not found.");
  await requireCanEditActivity(user, existing);

  await prisma.activity.update({ where: { id: activityId }, data: { status: "ARCHIVED" } });

  await recordAuditLog({
    actorId: user.id,
    action: "activity.archive",
    targetType: "Activity",
    targetId: activityId,
  });

  revalidatePath("/activities");
  revalidatePath(`/activities/${activityId}`);
}

export async function unarchiveActivity(activityId: string): Promise<void> {
  const user = await requireUser();
  const existing = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!existing) throw new Error("Activity not found.");
  await requireCanEditActivity(user, existing);

  await prisma.activity.update({ where: { id: activityId }, data: { status: "ACTIVE" } });

  await recordAuditLog({
    actorId: user.id,
    action: "activity.unarchive",
    targetType: "Activity",
    targetId: activityId,
  });

  revalidatePath("/activities");
  revalidatePath(`/activities/${activityId}`);
}
