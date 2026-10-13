"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/current-user";
import { ForbiddenError } from "@/lib/permissions/errors";
import { requireCanManageDecision, requireCanRecordMeeting } from "@/lib/permissions/meeting-access";
import { recordAuditLog } from "@/lib/audit/log";
import { createDecisionSchema, updateDecisionSchema } from "@/features/decisions/schema";

export type DecisionFormState = { error: string } | null;

async function validResponsibleId(id: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, status: true } });
  return user && user.status === "ACTIVE" ? user.id : null;
}

export async function createDecision(
  _prevState: DecisionFormState,
  formData: FormData,
): Promise<DecisionFormState> {
  const user = await requireUser();

  const parsed = createDecisionSchema.safeParse({
    description: formData.get("description"),
    decidedAt: formData.get("decidedAt"),
    responsibleId: formData.get("responsibleId"),
    projectId: formData.get("projectId"),
    meetingId: formData.get("meetingId"),
    followUpAction: formData.get("followUpAction"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  let projectId = parsed.data.projectId ?? null;
  const meetingId = parsed.data.meetingId ?? null;

  if (meetingId) {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, projectId: true },
    });
    if (!meeting) return { error: "Selected meeting does not exist." };
    projectId = meeting.projectId;
  }

  try {
    await requireCanRecordMeeting(user, projectId);
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message };
    throw err;
  }

  const responsibleId = await validResponsibleId(parsed.data.responsibleId);
  if (!responsibleId) {
    return { error: "Selected responsible person is not a valid active user." };
  }

  const decision = await prisma.decision.create({
    data: {
      description: parsed.data.description,
      decidedAt: new Date(parsed.data.decidedAt),
      responsibleId,
      projectId,
      meetingId,
      followUpAction: parsed.data.followUpAction ?? null,
    },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "decision.create",
    targetType: "Decision",
    targetId: decision.id,
  });

  revalidatePath("/decisions");
  if (meetingId) revalidatePath(`/meetings/${meetingId}`);
  redirect(`/decisions/${decision.id}`);
}

export async function updateDecision(
  decisionId: string,
  _prevState: DecisionFormState,
  formData: FormData,
): Promise<DecisionFormState> {
  const user = await requireUser();

  const existing = await prisma.decision.findUnique({ where: { id: decisionId } });
  if (!existing) return { error: "Decision not found." };

  try {
    await requireCanManageDecision(user, existing);
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message };
    throw err;
  }

  const parsed = updateDecisionSchema.safeParse({
    description: formData.get("description"),
    decidedAt: formData.get("decidedAt"),
    responsibleId: formData.get("responsibleId"),
    followUpAction: formData.get("followUpAction"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  const responsibleId = await validResponsibleId(parsed.data.responsibleId);
  if (!responsibleId) {
    return { error: "Selected responsible person is not a valid active user." };
  }

  await prisma.decision.update({
    where: { id: decisionId },
    data: {
      description: parsed.data.description,
      decidedAt: new Date(parsed.data.decidedAt),
      responsibleId,
      followUpAction: parsed.data.followUpAction ?? null,
      status: parsed.data.status,
    },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "decision.update",
    targetType: "Decision",
    targetId: decisionId,
    beforeValue: { status: existing.status },
    afterValue: { status: parsed.data.status },
  });

  revalidatePath(`/decisions/${decisionId}`);
  revalidatePath("/decisions");
  if (existing.meetingId) revalidatePath(`/meetings/${existing.meetingId}`);
  redirect(`/decisions/${decisionId}`);
}
