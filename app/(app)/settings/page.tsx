import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { CAN_MANAGE_SETTINGS } from "@/lib/permissions/roles";
import { getOrgSettings } from "@/features/settings/queries";
import { SettingsForm } from "@/features/settings/components/settings-form";

export const metadata = { title: "Settings — BFDO Management System" };

export default async function SettingsPage() {
  const user = await requireUser();
  if (!CAN_MANAGE_SETTINGS.has(user.role)) notFound();

  const settings = await getOrgSettings();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Organization-wide configuration. Admin-only.
        </p>
      </div>

      <SettingsForm
        organizationName={settings.organizationName}
        supportEmail={settings.supportEmail}
        publicGalleryEnabled={settings.publicGalleryEnabled}
      />
    </div>
  );
}
