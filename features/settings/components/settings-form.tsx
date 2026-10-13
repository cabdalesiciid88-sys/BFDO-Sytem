"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOrgSettings, type SettingsFormState } from "@/features/settings/actions";

export function SettingsForm({
  organizationName,
  supportEmail,
  publicGalleryEnabled,
}: {
  organizationName: string;
  supportEmail: string | null;
  publicGalleryEnabled: boolean;
}) {
  const [state, formAction, isPending] = useActionState<SettingsFormState, FormData>(
    updateOrgSettings,
    null,
  );

  return (
    <form
      action={formAction}
      key={`${organizationName}:${supportEmail}:${publicGalleryEnabled}`}
      className="max-w-md space-y-4 rounded-lg border p-4"
    >
      <div className="space-y-2">
        <Label htmlFor="organizationName">Organization name</Label>
        <Input
          id="organizationName"
          name="organizationName"
          defaultValue={organizationName}
          required
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="supportEmail">Support email</Label>
        <Input
          id="supportEmail"
          name="supportEmail"
          type="email"
          defaultValue={supportEmail ?? ""}
          disabled={isPending}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="publicGalleryEnabled"
          defaultChecked={publicGalleryEnabled}
          disabled={isPending}
          className="size-4"
        />
        Public gallery enabled
      </label>
      <p className="text-xs text-muted-foreground">
        When off, the public gallery page and its image/document links return not-found to
        visitors, even for already-approved items. Does not affect the internal review queue.
      </p>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save settings"}
      </Button>
      {state && "error" in state ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state && "success" in state ? (
        <p className="text-sm text-muted-foreground">Settings saved.</p>
      ) : null}
    </form>
  );
}
