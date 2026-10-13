"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/current-user";
import { hashPassword } from "@/lib/auth/password";
import { ForbiddenError } from "@/lib/permissions/errors";
import { CAN_MANAGE_USERS } from "@/lib/permissions/roles";
import { requireNotSelfDemotion } from "@/lib/permissions/user-access";
import { deactivateUser, reactivateUser } from "@/lib/users/lifecycle";
import { recordAuditLog } from "@/lib/audit/log";
import { createUserSchema, resetPasswordSchema, updateUserSchema } from "@/features/team/schema";

export type TeamFormState = { error: string } | null;
export type ResetPasswordState = { error: string } | { success: true } | null;

export async function createTeamMember(
  _prevState: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const user = await requireUser();
  if (!CAN_MANAGE_USERS.has(user.role)) {
    return { error: "You do not have permission to manage users." };
  }

  const parsed = createUserSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role"),
    departmentId: formData.get("departmentId"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "A user with this email already exists." };

  const passwordHash = await hashPassword(parsed.data.password);

  const created = await prisma.user.create({
    data: {
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      role: parsed.data.role,
      departmentId: parsed.data.departmentId ?? null,
      passwordHash,
      status: "ACTIVE",
    },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "user.create",
    targetType: "User",
    targetId: created.id,
    afterValue: { email: created.email, role: created.role },
  });

  revalidatePath("/team");
  redirect(`/team/${created.id}`);
}

export async function updateTeamMember(
  userId: string,
  _prevState: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const user = await requireUser();
  if (!CAN_MANAGE_USERS.has(user.role)) {
    return { error: "You do not have permission to manage users." };
  }

  const parsed = updateUserSchema.safeParse({
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    departmentId: formData.get("departmentId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  try {
    requireNotSelfDemotion(user.id, userId, parsed.data.role);
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message };
    throw err;
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) return { error: "User not found." };

  await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      departmentId: parsed.data.departmentId ?? null,
    },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "user.update",
    targetType: "User",
    targetId: userId,
    beforeValue: { fullName: existing.fullName, role: existing.role },
    afterValue: { fullName: parsed.data.fullName, role: parsed.data.role },
  });

  revalidatePath(`/team/${userId}`);
  revalidatePath("/team");
  redirect(`/team/${userId}`);
}

export async function deactivateTeamMember(userId: string): Promise<void> {
  const user = await requireUser();
  if (!CAN_MANAGE_USERS.has(user.role)) {
    throw new ForbiddenError("You do not have permission to manage users.");
  }
  if (userId === user.id) {
    throw new Error("You cannot deactivate your own account.");
  }

  await deactivateUser(userId);

  await recordAuditLog({
    actorId: user.id,
    action: "user.deactivate",
    targetType: "User",
    targetId: userId,
  });

  revalidatePath("/team");
  revalidatePath(`/team/${userId}`);
}

export async function reactivateTeamMember(userId: string): Promise<void> {
  const user = await requireUser();
  if (!CAN_MANAGE_USERS.has(user.role)) {
    throw new ForbiddenError("You do not have permission to manage users.");
  }

  await reactivateUser(userId);

  await recordAuditLog({
    actorId: user.id,
    action: "user.reactivate",
    targetType: "User",
    targetId: userId,
  });

  revalidatePath("/team");
  revalidatePath(`/team/${userId}`);
}

export async function resetTeamMemberPassword(
  userId: string,
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const user = await requireUser();
  if (!CAN_MANAGE_USERS.has(user.role)) {
    return { error: "You do not have permission to manage users." };
  }

  const parsed = resetPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  // Revoking sessions on password reset so a stolen session can't outlive
  // the credential change.
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId } });
  });

  await recordAuditLog({
    actorId: user.id,
    action: "user.password_reset",
    targetType: "User",
    targetId: userId,
  });

  revalidatePath(`/team/${userId}`);
  return { success: true };
}
