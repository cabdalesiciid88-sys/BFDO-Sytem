"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/current-user";
import { requireProjectManager } from "@/lib/permissions/project-access";
import { ForbiddenError } from "@/lib/permissions/errors";
import { CAN_CREATE_PROJECT } from "@/lib/permissions/roles";
import { recordAuditLog } from "@/lib/audit/log";
import { generateReferenceCode } from "@/lib/validation/reference-code";
import {
  addMemberSchema,
  createProjectSchema,
  updateProjectSchema,
} from "@/features/projects/schema";

export type ProjectFormState = { error: string } | null;

async function uniqueProjectReferenceCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferenceCode("PRJ");
    const existing = await prisma.project.findUnique({ where: { referenceCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique project reference code.");
}

function fieldsFromFormData(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description"),
    objectives: formData.get("objectives"),
    category: formData.get("category"),
    location: formData.get("location"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  };
}

export async function createProject(
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const user = await requireUser();
  if (!CAN_CREATE_PROJECT.has(user.role)) {
    return { error: "You do not have permission to create projects." };
  }

  const parsed = createProjectSchema.safeParse({
    ...fieldsFromFormData(formData),
    managerId: formData.get("managerId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  let managerId = user.id;
  if (user.role === "SYSTEM_ADMIN" && parsed.data.managerId) {
    const manager = await prisma.user.findUnique({
      where: { id: parsed.data.managerId },
      select: { id: true, status: true },
    });
    if (!manager || manager.status !== "ACTIVE") {
      return { error: "Selected manager is not a valid active user." };
    }
    managerId = manager.id;
  }

  const referenceCode = await uniqueProjectReferenceCode();

  const project = await prisma.project.create({
    data: {
      referenceCode,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      objectives: parsed.data.objectives ?? null,
      category: parsed.data.category ?? null,
      location: parsed.data.location ?? null,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      managerId,
      members: { create: { userId: managerId, roleInProject: "MANAGER" } },
    },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "project.create",
    targetType: "Project",
    targetId: project.id,
    afterValue: { title: project.title, referenceCode: project.referenceCode },
  });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(
  projectId: string,
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const user = await requireUser();
  try {
    await requireProjectManager(user, projectId);
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message };
    throw err;
  }

  const parsed = updateProjectSchema.safeParse({
    ...fieldsFromFormData(formData),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  const before = await prisma.project.findUnique({ where: { id: projectId } });
  if (!before) return { error: "Project not found." };

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      objectives: parsed.data.objectives ?? null,
      category: parsed.data.category ?? null,
      location: parsed.data.location ?? null,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      status: parsed.data.status,
      archivedAt:
        parsed.data.status === "ARCHIVED" ? before.archivedAt ?? new Date() : null,
    },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "project.update",
    targetType: "Project",
    targetId: projectId,
    beforeValue: { title: before.title, status: before.status },
    afterValue: { title: updated.title, status: updated.status },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}

export async function archiveProject(projectId: string): Promise<void> {
  const user = await requireUser();
  await requireProjectManager(user, projectId);

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "ARCHIVED", archivedAt: new Date() },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "project.archive",
    targetType: "Project",
    targetId: projectId,
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function unarchiveProject(projectId: string): Promise<void> {
  const user = await requireUser();
  await requireProjectManager(user, projectId);

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "ACTIVE", archivedAt: null },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "project.unarchive",
    targetType: "Project",
    targetId: projectId,
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export type MemberActionState = { error: string } | null;

export async function addProjectMember(
  projectId: string,
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const user = await requireUser();
  try {
    await requireProjectManager(user, projectId);
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message };
    throw err;
  }

  const parsed = addMemberSchema.safeParse({
    userId: formData.get("userId"),
    roleInProject: formData.get("roleInProject"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { status: true },
  });
  if (!targetUser || targetUser.status !== "ACTIVE") {
    return { error: "Selected user is not a valid active account." };
  }

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: parsed.data.userId } },
    create: { projectId, userId: parsed.data.userId, roleInProject: parsed.data.roleInProject },
    update: { roleInProject: parsed.data.roleInProject },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "project.member.add",
    targetType: "Project",
    targetId: projectId,
    metadata: { userId: parsed.data.userId, roleInProject: parsed.data.roleInProject },
  });

  revalidatePath(`/projects/${projectId}`);
  return null;
}

export async function removeProjectMember(projectId: string, userId: string): Promise<void> {
  const user = await requireUser();
  await requireProjectManager(user, projectId);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { managerId: true },
  });
  if (project?.managerId === userId) {
    throw new Error("Cannot remove the project manager. Reassign management first.");
  }

  await prisma.projectMember.deleteMany({ where: { projectId, userId } });

  await recordAuditLog({
    actorId: user.id,
    action: "project.member.remove",
    targetType: "Project",
    targetId: projectId,
    metadata: { userId },
  });

  revalidatePath(`/projects/${projectId}`);
}
