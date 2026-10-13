"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTaskStatus, type TaskStatusState } from "@/features/tasks/actions";
import { TASK_STATUS_VALUES } from "@/features/tasks/schema";

export function TaskStatusForm({
  taskId,
  status,
  completionNotes,
}: {
  taskId: string;
  status: string;
  completionNotes: string | null;
}) {
  const action = updateTaskStatus.bind(null, taskId);
  const [state, formAction, isPending] = useActionState<TaskStatusState, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            name="status"
            defaultValue={status}
            items={TASK_STATUS_VALUES.map((value) => ({
              value,
              label: value.replaceAll("_", " "),
            }))}
          >
            <SelectTrigger id="status" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUS_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Updating…" : "Update status"}
        </Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor="completionNotes">Notes</Label>
        <Textarea
          id="completionNotes"
          name="completionNotes"
          defaultValue={completionNotes ?? ""}
          disabled={isPending}
        />
      </div>
      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
