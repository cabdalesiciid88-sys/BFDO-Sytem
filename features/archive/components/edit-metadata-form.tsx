"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateMediaMetadata, type MediaFormState } from "@/features/archive/actions";

export function EditMetadataForm({
  mediaId,
  description,
  keywords,
}: {
  mediaId: string;
  description: string | null;
  keywords: string | null;
}) {
  const action = updateMediaMetadata.bind(null, mediaId);
  const [state, formAction, isPending] = useActionState<MediaFormState, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={description ?? ""}
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="keywords">Keywords</Label>
        <Input
          id="keywords"
          name="keywords"
          defaultValue={keywords ?? ""}
          placeholder="Comma-separated, for search"
          disabled={isPending}
        />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
