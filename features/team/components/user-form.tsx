"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTeamMember, updateTeamMember, type TeamFormState } from "@/features/team/actions";
import { ROLE_VALUES } from "@/features/team/schema";

type SelectableDepartment = { id: string; name: string };

type EditableUser = {
  id: string;
  fullName: string;
  role: string;
  departmentId: string | null;
};

type UserFormProps = {
  departments: SelectableDepartment[];
} & ({ mode: "create" } | { mode: "edit"; targetUser: EditableUser });

const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: "System Administrator",
  LEADERSHIP: "Organization Leadership",
  PROJECT_MANAGER: "Project Manager",
  COORDINATOR: "Coordinator",
  TEAM_MEMBER: "Team Member",
};

export function UserForm(props: UserFormProps) {
  const action =
    props.mode === "create" ? createTeamMember : updateTeamMember.bind(null, props.targetUser.id);
  const [state, formAction, isPending] = useActionState<TeamFormState, FormData>(action, null);

  const existing = props.mode === "edit" ? props.targetUser : null;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            name="fullName"
            required
            defaultValue={existing?.fullName ?? ""}
            disabled={isPending}
          />
        </div>

        {props.mode === "create" ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required disabled={isPending} />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select
            name="role"
            required
            defaultValue={existing?.role ?? "TEAM_MEMBER"}
            items={ROLE_VALUES.map((value) => ({ value, label: ROLE_LABELS[value] }))}
          >
            <SelectTrigger id="role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {ROLE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {props.departments.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="departmentId">Department</Label>
            <Select
              name="departmentId"
              defaultValue={existing?.departmentId ?? undefined}
              items={props.departments.map((dept) => ({ value: dept.id, label: dept.name }))}
            >
              <SelectTrigger id="departmentId" className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {props.departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {props.mode === "create" ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="password">Initial password</Label>
            <Input id="password" name="password" type="text" required disabled={isPending} />
            <p className="text-xs text-muted-foreground">
              Share this with the new team member directly — there is no email invite yet (see
              docs/project-status.md blockers).
            </p>
          </div>
        ) : null}
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : props.mode === "create" ? "Create account" : "Save changes"}
      </Button>
    </form>
  );
}
