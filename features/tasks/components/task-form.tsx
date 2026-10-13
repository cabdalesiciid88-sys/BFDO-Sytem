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
import { createTask, updateTask, type TaskFormState } from "@/features/tasks/actions";
import { TASK_PRIORITY_VALUES, TASK_STATUS_VALUES } from "@/features/tasks/schema";

type SelectableProject = { id: string; title: string };
type SelectableUser = { id: string; fullName: string; email: string };

type EditableTask = {
  id: string;
  title: string;
  description: string | null;
  projectId: string | null;
  assigneeId: string | null;
  priority: string;
  dueDate: Date | null;
  status: string;
  completionNotes: string | null;
};

type TaskFormProps = {
  projects: SelectableProject[];
  users: SelectableUser[];
} & ({ mode: "create" } | { mode: "edit"; task: EditableTask });

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function TaskForm(props: TaskFormProps) {
  const action = props.mode === "create" ? createTask : updateTask.bind(null, props.task.id);
  const [state, formAction, isPending] = useActionState<TaskFormState, FormData>(action, null);

  const existing = props.mode === "edit" ? props.task : null;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required defaultValue={existing?.title ?? ""} disabled={isPending} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" defaultValue={existing?.description ?? ""} disabled={isPending} />
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
          <Label htmlFor="assigneeId">Assignee</Label>
          <Select
            name="assigneeId"
            defaultValue={existing?.assigneeId ?? undefined}
            items={props.users.map((user) => ({
              value: user.id,
              label: `${user.fullName} (${user.email})`,
            }))}
          >
            <SelectTrigger id="assigneeId" className="w-full">
              <SelectValue placeholder="Unassigned" />
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

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select name="priority" defaultValue={existing?.priority ?? "MEDIUM"}>
            <SelectTrigger id="priority" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITY_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={toDateInputValue(existing?.dueDate ?? null)}
            disabled={isPending}
          />
        </div>

        {props.mode === "edit" ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                name="status"
                defaultValue={props.task.status}
                items={TASK_STATUS_VALUES.map((value) => ({
                  value,
                  label: value.replaceAll("_", " "),
                }))}
              >
                <SelectTrigger id="status" className="w-full">
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
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="completionNotes">Completion notes</Label>
              <Textarea
                id="completionNotes"
                name="completionNotes"
                defaultValue={props.task.completionNotes ?? ""}
                disabled={isPending}
              />
            </div>
          </>
        ) : null}
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : props.mode === "create" ? "Create task" : "Save changes"}
      </Button>
    </form>
  );
}
