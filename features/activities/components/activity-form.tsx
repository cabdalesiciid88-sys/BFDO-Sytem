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
import {
  createActivity,
  updateActivity,
  type ActivityFormState,
} from "@/features/activities/actions";
import { ACTIVITY_STATUS_VALUES } from "@/features/activities/schema";

type SelectableProject = { id: string; title: string };
type SelectableUser = { id: string; fullName: string; email: string };

type EditableActivity = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  activityDate: Date;
  outcomes: string | null;
  status: string;
  projectId: string | null;
  responsibleId: string;
  participants: { user: { id: string } }[];
};

type ActivityFormProps = {
  projects: SelectableProject[];
  users: SelectableUser[];
  canLeaveProjectBlank: boolean;
} & ({ mode: "create" } | { mode: "edit"; activity: EditableActivity });

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function ActivityForm(props: ActivityFormProps) {
  const action =
    props.mode === "create" ? createActivity : updateActivity.bind(null, props.activity.id);
  const [state, formAction, isPending] = useActionState<ActivityFormState, FormData>(
    action,
    null,
  );

  const existing = props.mode === "edit" ? props.activity : null;
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
              <SelectValue placeholder={props.canLeaveProjectBlank ? "No project" : "Select a project"} />
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
          <Label htmlFor="activityDate">Activity date</Label>
          <Input
            id="activityDate"
            name="activityDate"
            type="date"
            required
            defaultValue={existing ? toDateInputValue(existing.activityDate) : ""}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input id="category" name="category" defaultValue={existing?.category ?? ""} disabled={isPending} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" defaultValue={existing?.location ?? ""} disabled={isPending} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="responsibleId">Responsible</Label>
          <Select
            name="responsibleId"
            required
            defaultValue={existing?.responsibleId}
            items={props.users.map((user) => ({
              value: user.id,
              label: `${user.fullName} (${user.email})`,
            }))}
          >
            <SelectTrigger id="responsibleId" className="w-full">
              <SelectValue placeholder="Select a person" />
            </SelectTrigger>
            <SelectContent>
              {props.users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.fullName} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {props.mode === "edit" ? (
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={props.activity.status}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_STATUS_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" defaultValue={existing?.description ?? ""} disabled={isPending} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="outcomes">Outcomes</Label>
          <Textarea id="outcomes" name="outcomes" defaultValue={existing?.outcomes ?? ""} disabled={isPending} />
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
        {isPending ? "Saving…" : props.mode === "create" ? "Record activity" : "Save changes"}
      </Button>
    </form>
  );
}
