"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addProjectMember,
  removeProjectMember,
  type MemberActionState,
} from "@/features/projects/actions";

type Member = {
  userId: string;
  fullName: string;
  email: string;
  roleInProject: string;
};

type AssignableUser = { id: string; fullName: string; email: string };

export function MemberManager({
  projectId,
  managerId,
  members,
  assignableUsers,
}: {
  projectId: string;
  managerId: string;
  members: Member[];
  assignableUsers: AssignableUser[];
}) {
  const addMember = addProjectMember.bind(null, projectId);
  const [state, formAction, isPending] = useActionState<MemberActionState, FormData>(
    addMember,
    null,
  );

  const existingIds = new Set(members.map((m) => m.userId));
  const candidates = assignableUsers.filter((u) => !existingIds.has(u.id));

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {members.map((member) => (
          <li
            key={member.userId}
            className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium">{member.fullName}</p>
              <p className="text-xs text-muted-foreground">{member.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{member.roleInProject.replaceAll("_", " ")}</Badge>
              {member.userId !== managerId ? (
                <form action={removeProjectMember.bind(null, projectId, member.userId)}>
                  <Button type="submit" variant="ghost" size="sm">
                    Remove
                  </Button>
                </form>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {candidates.length > 0 ? (
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="userId">Add member</Label>
            <Select
              name="userId"
              required
              items={candidates.map((user) => ({
                value: user.id,
                label: `${user.fullName} (${user.email})`,
              }))}
            >
              <SelectTrigger id="userId" className="w-56">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullName} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="roleInProject">Role</Label>
            <Select
              name="roleInProject"
              defaultValue="MEMBER"
              items={[
                { value: "MEMBER", label: "Member" },
                { value: "COORDINATOR", label: "Coordinator" },
                { value: "MANAGER", label: "Manager" },
              ]}
            >
              <SelectTrigger id="roleInProject" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="COORDINATOR">Coordinator</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Adding…" : "Add"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Every active user is already a member of this project.
        </p>
      )}

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
