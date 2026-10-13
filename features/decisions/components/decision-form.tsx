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
import { createDecision, updateDecision, type DecisionFormState } from "@/features/decisions/actions";
import { DECISION_STATUS_VALUES } from "@/features/decisions/schema";

type SelectableUser = { id: string; fullName: string; email: string };
type SelectableProject = { id: string; title: string };

type EditableDecision = {
  id: string;
  description: string;
  decidedAt: Date;
  responsibleId: string;
  followUpAction: string | null;
  status: string;
};

type DecisionFormProps =
  | { mode: "create-standalone"; projects: SelectableProject[]; users: SelectableUser[] }
  | { mode: "create-for-meeting"; meetingId: string; users: SelectableUser[] }
  | { mode: "edit"; decision: EditableDecision; users: SelectableUser[] };

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function DecisionForm(props: DecisionFormProps) {
  const action = props.mode === "edit" ? updateDecision.bind(null, props.decision.id) : createDecision;
  const [state, formAction, isPending] = useActionState<DecisionFormState, FormData>(
    action,
    null,
  );

  const existing = props.mode === "edit" ? props.decision : null;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {props.mode === "create-for-meeting" ? (
        <input type="hidden" name="meetingId" value={props.meetingId} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            required
            defaultValue={existing?.description ?? ""}
            disabled={isPending}
          />
        </div>

        {props.mode === "create-standalone" ? (
          <div className="space-y-2">
            <Label htmlFor="projectId">Project</Label>
            <Select
              name="projectId"
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
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="decidedAt">Decided on</Label>
          <Input
            id="decidedAt"
            name="decidedAt"
            type="date"
            required
            defaultValue={existing ? toDateInputValue(existing.decidedAt) : ""}
            disabled={isPending}
          />
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
            <Select
              name="status"
              defaultValue={props.decision.status}
              items={DECISION_STATUS_VALUES.map((value) => ({
                value,
                label: value.replaceAll("_", " "),
              }))}
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DECISION_STATUS_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="followUpAction">Follow-up action</Label>
          <Textarea
            id="followUpAction"
            name="followUpAction"
            defaultValue={existing?.followUpAction ?? ""}
            disabled={isPending}
          />
        </div>
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : props.mode === "edit" ? "Save changes" : "Record decision"}
      </Button>
    </form>
  );
}
