"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/current-user";
import { CAN_MANAGE_SETTINGS } from "@/lib/permissions/roles";
import { recordAuditLog } from "@/lib/audit/log";
import { getOrgSettings } from "@/features/settings/queries";
import { updateOrgSettingsSchema } from "@/features/settings/schema";

export type SettingsFormState = { error: string } | { success: true } | null;

export async function updateOrgSettings(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireUser();
  if (!CAN_MANAGE_SETTINGS.has(user.role)) {
    return { error: "You do not have permission to manage system settings." };
  }

  const parsed = updateOrgSettingsSchema.safeParse({
    organizationName: formData.get("organizationName"),
    supportEmail: formData.get("supportEmail"),
    publicGalleryEnabled: formData.get("publicGalleryEnabled"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  const before = await getOrgSettings();

  const updated = await prisma.orgSettings.update({
    where: { id: before.id },
    data: {
      organizationName: parsed.data.organizationName,
      supportEmail: parsed.data.supportEmail ?? null,
      publicGalleryEnabled: parsed.data.publicGalleryEnabled,
      updatedById: user.id,
    },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "settings.update",
    targetType: "OrgSettings",
    targetId: updated.id,
    beforeValue: {
      organizationName: before.organizationName,
      supportEmail: before.supportEmail,
      publicGalleryEnabled: before.publicGalleryEnabled,
    },
    afterValue: {
      organizationName: updated.organizationName,
      supportEmail: updated.supportEmail,
      publicGalleryEnabled: updated.publicGalleryEnabled,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/gallery");
  return { success: true };
}
