"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/current-user";
import { ForbiddenError } from "@/lib/permissions/errors";
import { requireCanManageMeeting, requireCanRecordMeeting } from "@/lib/permissions/meeting-access";
import { recordAuditLog } from "@/lib/audit/log";
import { createMeetingSchema, updateMeetingSchema } from "@/features/meetings/schema";

export type MeetingFormState = { error: string } | null;

function fieldsFromFormData(formData: FormData) {
  return {
    title: formData.get("title"),
    heldAt: formData.get("heldAt"),
    location: formData.get("location"),
    method: formData.get("method"),
    agenda: formData.get("agenda"),
    notes: formData.get("notes"),
    projectId: formData.get("projectId"),
  };
}

function uniqueParticipantIds(formData: FormData): string[] {
  return Array.from(new Set(formData.getAll("participantIds").map(String).filter(Boolean)));
}

export async function createMeeting(
  _prevState: MeetingFormState,
  formData: FormData,
): Promise<MeetingFormState> {
  const user = await requireUser();

  const parsed = createMeetingSchema.safeParse(fieldsFromFormData(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  try {
    await requireCanRecordMeeting(user, parsed.data.projectId ?? null);
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message };
    throw err;
  }

  const heldAt = new Date(parsed.data.heldAt);
  if (Number.isNaN(heldAt.getTime())) {
    return { error: "Enter a valid date and time." };
  }

  const meeting = await prisma.meeting.create({
    data: {
      title: parsed.data.title,
      heldAt,
      location: parsed.data.location ?? null,
      method: parsed.data.method ?? null,
      agenda: parsed.data.agenda ?? null,
      notes: parsed.data.notes ?? null,
      projectId: parsed.data.projectId ?? null,
      createdById: user.id,
      participants: { create: uniqueParticipantIds(formData).map((userId) => ({ userId })) },
    },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "meeting.create",
    targetType: "Meeting",
    targetId: meeting.id,
    afterValue: { title: meeting.title },
  });

  revalidatePath("/meetings");
  redirect(`/meetings/${meeting.id}`);
}

export async function updateMeeting(
  meetingId: string,
  _prevState: MeetingFormState,
  formData: FormData,
): Promise<MeetingFormState> {
  const user = await requireUser();

  const existing = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!existing) return { error: "Meeting not found." };

  try {
    await requireCanManageMeeting(user, existing);
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message };
    throw err;
  }

  const parsed = updateMeetingSchema.safeParse(fieldsFromFormData(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  const nextProjectId = parsed.data.projectId ?? null;
  if (nextProjectId !== existing.projectId) {
    try {
      await requireCanRecordMeeting(user, nextProjectId);
    } catch (err) {
      if (err instanceof ForbiddenError) return { error: err.message };
      throw err;
    }
  }

  const heldAt = new Date(parsed.data.heldAt);
  if (Number.isNaN(heldAt.getTime())) {
    return { error: "Enter a valid date and time." };
  }

  const participantIds = uniqueParticipantIds(formData);

  await prisma.$transaction([
    prisma.meetingParticipant.deleteMany({ where: { meetingId } }),
    prisma.meeting.update({
      where: { id: meetingId },
      data: {
        title: parsed.data.title,
        heldAt,
        location: parsed.data.location ?? null,
        method: parsed.data.method ?? null,
        agenda: parsed.data.agenda ?? null,
        notes: parsed.data.notes ?? null,
        projectId: nextProjectId,
        participants: { create: participantIds.map((userId) => ({ userId })) },
      },
    }),
  ]);

  await recordAuditLog({
    actorId: user.id,
    action: "meeting.update",
    targetType: "Meeting",
    targetId: meetingId,
    beforeValue: { title: existing.title },
    afterValue: { title: parsed.data.title },
  });

  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath("/meetings");
  redirect(`/meetings/${meetingId}`);
}
