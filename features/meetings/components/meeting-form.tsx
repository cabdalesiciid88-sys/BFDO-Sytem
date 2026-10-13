"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMeeting, updateMeeting, type MeetingFormState } from "@/features/meetings/actions";

type SelectableProject = { id: string; title: string };
type SelectableUser = { id: string; fullName: string; email: string };

type EditableMeeting = {
  id: string;
  title: string;
  heldAt: Date;
  location: string | null;
  method: string | null;
  agenda: string | null;
  notes: string | null;
  projectId: string | null;
  participants: { user: { id: string } }[];
};

type MeetingFormProps = {
  projects: SelectableProject[];
  users: SelectableUser[];
} & ({ mode: "create" } | { mode: "edit"; meeting: EditableMeeting });

function toDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function MeetingForm(props: MeetingFormProps) {
  const action =
    props.mode === "create" ? createMeeting : updateMeeting.bind(null, props.meeting.id);
  const [state, formAction, isPending] = useActionState<MeetingFormState, FormData>(
    action,
    null,
  );

  const existing = props.mode === "edit" ? props.meeting : null;
  const participantIds = new Set(existing?.participants.map((p) => p.user.id) ?? []);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required defaultValue={existing?.title ?? ""} disabled={isPending} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectId">Project</Label>
          <Select
            name="projectId"
            defaultValue={existing?.projectId ?? undefined}
            items={props.projects.map((project) => ({ value: project.id, label: project.title }))}
          >
            <SelectTrigger id="projectId" className="w-full">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {props.projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="heldAt">Date &amp; time</Label>
          <Input
            id="heldAt"
            name="heldAt"
            type="datetime-local"
            required
            defaultValue={existing ? toDateTimeInputValue(existing.heldAt) : ""}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" defaultValue={existing?.location ?? ""} disabled={isPending} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="method">Method</Label>
          <Input
            id="method"
            name="method"
            placeholder="In person, video call…"
            defaultValue={existing?.method ?? ""}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="agenda">Agenda</Label>
          <Textarea id="agenda" name="agenda" defaultValue={existing?.agenda ?? ""} disabled={isPending} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" defaultValue={existing?.notes ?? ""} disabled={isPending} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Participants</Label>
          <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border p-3">
            {props.users.map((user) => (
              <label key={user.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="participantIds"
                  value={user.id}
                  defaultChecked={participantIds.has(user.id)}
                  disabled={isPending}
                  className="size-4 rounded border-input"
                />
                {user.fullName}
              </label>
            ))}
          </div>
        </div>
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : props.mode === "create" ? "Record meeting" : "Save changes"}
      </Button>
    </form>
  );
}
