"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetTeamMemberPassword, type ResetPasswordState } from "@/features/team/actions";

export function ResetPasswordForm({ userId }: { userId: string }) {
  const action = resetTeamMemberPassword.bind(null, userId);
  const [state, formAction, isPending] = useActionState<ResetPasswordState, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="text" required disabled={isPending} />
      </div>
      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? "Resetting…" : "Reset password"}
      </Button>
      {state && "error" in state ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state && "success" in state ? (
        <p className="text-sm text-muted-foreground">
          Password reset. Share the new password with the user directly — this also signed them
          out everywhere.
        </p>
      ) : null}
    </form>
  );
}
