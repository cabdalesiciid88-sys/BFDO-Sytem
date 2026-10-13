"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/current-user";
import { ForbiddenError } from "@/lib/permissions/errors";
import {
  requireCanCreateTaskInProject,
  requireCanManageTask,
  requireCanUpdateTaskStatus,
} from "@/lib/permissions/task-access";
import { recordAuditLog } from "@/lib/audit/log";
import { createTaskSchema, updateTaskSchema, updateTaskStatusSchema } from "@/features/tasks/schema";

export type TaskFormState = { error: string } | null;
export type TaskStatusState = { error: string } | null;

function fieldsFromFormData(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description"),
    projectId: formData.get("projectId"),
    assigneeId: formData.get("assigneeId"),
    priority: formData.get("priority"),
    dueDate: formData.get("dueDate"),
  };
}

async function validateAssignee(
  assigneeId: string | undefined,
): Promise<{ ok: true; assigneeId: string | null } | { ok: false; error: string }> {
  if (!assigneeId) return { ok: true, assigneeId: null };
  const user = await prisma.user.findUnique({
    where: { id: assigneeId },
    select: { id: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") {
    return { ok: false, error: "Selected assignee is not a valid active user." };
  }
  return { ok: true, assigneeId: user.id };
}

function completedAtFor(
  nextStatus: string,
  existing: { status: string; completedAt: Date | null },
): Date | null {
  if (nextStatus === "COMPLETED") return existing.completedAt ?? new Date();
  if (existing.status === "COMPLETED") return null;
  return existing.completedAt;
}

export async function createTask(
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const user = await requireUser();

  const parsed = createTaskSchema.safeParse(fieldsFromFormData(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  try {
    await requireCanCreateTaskInProject(user, parsed.data.projectId ?? null);
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message };
    throw err;
  }

  const assignee = await validateAssignee(parsed.data.assigneeId);
  if (!assignee.ok) return { error: assignee.error };

  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      projectId: parsed.data.projectId ?? null,
      assigneeId: assignee.assigneeId,
      priority: parsed.data.priority,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      createdById: user.id,
    },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "task.create",
    targetType: "Task",
    targetId: task.id,
    afterValue: { title: task.title },
  });

  revalidatePath("/tasks");
  redirect(`/tasks/${task.id}`);
}

export async function updateTask(
  taskId: string,
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const user = await requireUser();

  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) return { error: "Task not found." };

  try {
    await requireCanManageTask(user, existing);
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message };
    throw err;
  }

  const parsed = updateTaskSchema.safeParse({
    ...fieldsFromFormData(formData),
    status: formData.get("status"),
    completionNotes: formData.get("completionNotes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  const nextProjectId = parsed.data.projectId ?? null;
  if (nextProjectId !== existing.projectId) {
    try {
      await requireCanCreateTaskInProject(user, nextProjectId);
    } catch (err) {
      if (err instanceof ForbiddenError) return { error: err.message };
      throw err;
    }
  }

  const assignee = await validateAssignee(parsed.data.assigneeId);
  if (!assignee.ok) return { error: assignee.error };

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      projectId: nextProjectId,
      assigneeId: assignee.assigneeId,
      priority: parsed.data.priority,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      status: parsed.data.status,
      completionNotes: parsed.data.completionNotes ?? null,
      completedAt: completedAtFor(parsed.data.status, existing),
    },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "task.update",
    targetType: "Task",
    targetId: taskId,
    beforeValue: { title: existing.title, status: existing.status },
    afterValue: { title: parsed.data.title, status: parsed.data.status },
  });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  redirect(`/tasks/${taskId}`);
}

export async function updateTaskStatus(
  taskId: string,
  _prevState: TaskStatusState,
  formData: FormData,
): Promise<TaskStatusState> {
  const user = await requireUser();

  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) return { error: "Task not found." };

  try {
    await requireCanUpdateTaskStatus(user, existing);
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message };
    throw err;
  }

  const parsed = updateTaskStatusSchema.safeParse({
    status: formData.get("status"),
    completionNotes: formData.get("completionNotes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: parsed.data.status,
      completionNotes: parsed.data.completionNotes ?? existing.completionNotes,
      completedAt: completedAtFor(parsed.data.status, existing),
    },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "task.status_update",
    targetType: "Task",
    targetId: taskId,
    beforeValue: { status: existing.status },
    afterValue: { status: parsed.data.status },
  });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  return null;
}
