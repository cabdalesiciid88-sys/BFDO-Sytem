import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth/current-user";
import { getUserDetail } from "@/features/team/queries";
import { deactivateTeamMember, reactivateTeamMember } from "@/features/team/actions";
import { ResetPasswordForm } from "@/features/team/components/reset-password-form";
import { CAN_MANAGE_USERS } from "@/lib/permissions/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: "System Administrator",
  LEADERSHIP: "Organization Leadership",
  PROJECT_MANAGER: "Project Manager",
  COORDINATOR: "Coordinator",
  TEAM_MEMBER: "Team Member",
};

export default async function TeamMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requireUser();
  if (!CAN_MANAGE_USERS.has(currentUser.role)) notFound();

  const { id } = await params;
  const target = await getUserDetail(id);
  if (!target) notFound();

  const isSelf = target.id === currentUser.id;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{target.fullName}</h1>
          <p className="text-sm text-muted-foreground">{target.email}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={target.status === "DEACTIVATED" ? "destructive" : "default"}>
              {target.status}
            </Badge>
            <span className="text-sm text-muted-foreground">{ROLE_LABELS[target.role]}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href={`/team/${target.id}/edit`} />}>
            Edit
          </Button>
          {!isSelf ? (
            target.status === "DEACTIVATED" ? (
              <form action={reactivateTeamMember.bind(null, target.id)}>
                <Button type="submit" variant="outline">
                  Reactivate
                </Button>
              </form>
            ) : (
              <form action={deactivateTeamMember.bind(null, target.id)}>
                <Button type="submit" variant="destructive">
                  Deactivate
                </Button>
              </form>
            )
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <dl className="grid grid-cols-2 gap-2 text-muted-foreground">
            <dt>Department</dt>
            <dd className="text-foreground">{target.department?.name ?? "—"}</dd>
            <dt>Phone</dt>
            <dd className="text-foreground">{target.phone ?? "—"}</dd>
            <dt>Created</dt>
            <dd className="text-foreground">{format(target.createdAt, "MMM d, yyyy")}</dd>
            <dt>Last login</dt>
            <dd className="text-foreground">
              {target.lastLoginAt ? format(target.lastLoginAt, "MMM d, yyyy p") : "Never"}
            </dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm userId={target.id} />
        </CardContent>
      </Card>
    </div>
  );
}
