import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth/current-user";
import { getProjectDetail, listActiveUsersForAssignment } from "@/features/projects/queries";
import { getProjectRole } from "@/lib/permissions/project-access";
import { archiveProject, unarchiveProject } from "@/features/projects/actions";
import { MemberManager } from "@/features/projects/components/member-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ForbiddenError } from "@/lib/permissions/errors";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PLANNED: "outline",
  ACTIVE: "default",
  ON_HOLD: "secondary",
  COMPLETED: "secondary",
  ARCHIVED: "destructive",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const project = await getProjectDetail(user, id).catch((err) => {
    // Another project's ID must 404, not 403 — never confirm existence to
    // someone not assigned (docs/permissions.md hard rule 4).
    if (err instanceof ForbiddenError) notFound();
    throw err;
  });
  if (!project) notFound();

  const canManage =
    user.role === "SYSTEM_ADMIN" || (await getProjectRole(user.id, project.id)) === "MANAGER";
  const assignableUsers = canManage ? await listActiveUsersForAssignment() : [];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{project.referenceCode}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[project.status] ?? "outline"}>
              {project.status.replaceAll("_", " ")}
            </Badge>
            {project.category ? (
              <span className="text-sm text-muted-foreground">{project.category}</span>
            ) : null}
          </div>
        </div>
        {canManage ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/projects/${project.id}/edit`} />}>
              Edit
            </Button>
            {project.status === "ARCHIVED" ? (
              <form action={unarchiveProject.bind(null, project.id)}>
                <Button type="submit" variant="outline">
                  Unarchive
                </Button>
              </form>
            ) : (
              <form action={archiveProject.bind(null, project.id)}>
                <Button type="submit" variant="destructive">
                  Archive
                </Button>
              </form>
            )}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {project.description ? (
              <p className="whitespace-pre-wrap">{project.description}</p>
            ) : (
              <p className="text-muted-foreground">No description.</p>
            )}
            {project.objectives ? (
              <div>
                <p className="font-medium">Objectives</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{project.objectives}</p>
              </div>
            ) : null}
            <dl className="grid grid-cols-2 gap-2 pt-2 text-muted-foreground">
              <dt>Manager</dt>
              <dd className="text-foreground">{project.manager.fullName}</dd>
              <dt>Location</dt>
              <dd className="text-foreground">{project.location ?? "—"}</dd>
              <dt>Start date</dt>
              <dd className="text-foreground">
                {project.startDate ? format(project.startDate, "MMM d, yyyy") : "—"}
              </dd>
              <dt>End date</dt>
              <dd className="text-foreground">
                {project.endDate ? format(project.endDate, "MMM d, yyyy") : "—"}
              </dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <dt>Activities</dt>
              <dd className="text-right text-foreground">{project._count.activities}</dd>
              <dt>Tasks</dt>
              <dd className="text-right text-foreground">{project._count.tasks}</dd>
              <dt>Meetings</dt>
              <dd className="text-right text-foreground">{project._count.meetings}</dd>
              <dt>Decisions</dt>
              <dd className="text-right text-foreground">{project._count.decisions}</dd>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <MemberManager
              projectId={project.id}
              managerId={project.manager.id}
              members={project.members.map((m) => ({
                userId: m.user.id,
                fullName: m.user.fullName,
                email: m.user.email,
                roleInProject: m.roleInProject,
              }))}
              assignableUsers={assignableUsers}
            />
          ) : (
            <ul className="space-y-2">
              {project.members.map((m) => (
                <li key={m.user.id} className="flex items-center justify-between text-sm">
                  <span>{m.user.fullName}</span>
                  <Badge variant="secondary">{m.roleInProject.replaceAll("_", " ")}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
