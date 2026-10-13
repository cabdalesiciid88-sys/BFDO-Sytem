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
  createProject,
  updateProject,
  type ProjectFormState,
} from "@/features/projects/actions";
import { PROJECT_STATUS_VALUES } from "@/features/projects/schema";

type AssignableUser = { id: string; fullName: string; email: string };

type EditableProject = {
  id: string;
  title: string;
  description: string | null;
  objectives: string | null;
  category: string | null;
  location: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
};

type ProjectFormProps =
  | { mode: "create"; isAdmin: boolean; assignableUsers: AssignableUser[] }
  | { mode: "edit"; project: EditableProject };

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function ProjectForm(props: ProjectFormProps) {
  const action =
    props.mode === "create" ? createProject : updateProject.bind(null, props.project.id);
  const [state, formAction, isPending] = useActionState<ProjectFormState, FormData>(
    action,
    null,
  );

  const text = props.mode === "edit" ? props.project : null;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required defaultValue={text?.title ?? ""} disabled={isPending} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={text?.description ?? ""}
            disabled={isPending}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="objectives">Objectives</Label>
          <Textarea
            id="objectives"
            name="objectives"
            defaultValue={text?.objectives ?? ""}
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input id="category" name="category" defaultValue={text?.category ?? ""} disabled={isPending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" defaultValue={text?.location ?? ""} disabled={isPending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={toDateInputValue(text?.startDate ?? null)}
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End date</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={toDateInputValue(text?.endDate ?? null)}
            disabled={isPending}
          />
        </div>

        {props.mode === "edit" ? (
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              name="status"
              defaultValue={props.project.status}
              items={PROJECT_STATUS_VALUES.map((value) => ({
                value,
                label: value.replaceAll("_", " "),
              }))}
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUS_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {props.mode === "create" && props.isAdmin ? (
          <div className="space-y-2">
            <Label htmlFor="managerId">Project manager</Label>
            <Select
              name="managerId"
              items={props.assignableUsers.map((assignable) => ({
                value: assignable.id,
                label: `${assignable.fullName} (${assignable.email})`,
              }))}
            >
              <SelectTrigger id="managerId" className="w-full">
                <SelectValue placeholder="Me (default)" />
              </SelectTrigger>
              <SelectContent>
                {props.assignableUsers.map((assignable) => (
                  <SelectItem key={assignable.id} value={assignable.id}>
                    {assignable.fullName} ({assignable.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : props.mode === "create" ? "Create project" : "Save changes"}
      </Button>
    </form>
  );
}
