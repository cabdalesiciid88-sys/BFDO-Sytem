import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth/current-user";
import { getTaskDetail } from "@/features/tasks/queries";
import { canManageTask, canUpdateTaskStatus } from "@/lib/permissions/task-access";
import { TaskStatusForm } from "@/features/tasks/components/task-status-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ForbiddenError } from "@/lib/permissions/errors";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const task = await getTaskDetail(user, id).catch((err) => {
    if (err instanceof ForbiddenError) notFound();
    throw err;
  });
  if (!task) notFound();

  const [canManage, canUpdateStatus] = await Promise.all([
    canManageTask(user, task),
    canUpdateTaskStatus(user, task),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={task.status === "COMPLETED" ? "secondary" : "default"}>
              {task.status.replaceAll("_", " ")}
            </Badge>
            <Badge variant="outline">{task.priority}</Badge>
          </div>
        </div>
        {canManage ? (
          <Button variant="outline" nativeButton={false} render={<Link href={`/tasks/${task.id}/edit`} />}>
            Edit
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {task.description ? (
              <p className="whitespace-pre-wrap">{task.description}</p>
            ) : (
              <p className="text-muted-foreground">No description.</p>
            )}
            <dl className="grid grid-cols-2 gap-2 pt-2 text-muted-foreground">
              <dt>Project</dt>
              <dd className="text-foreground">
                {task.project ? (
                  <Link href={`/projects/${task.project.id}`} className="hover:underline">
                    {task.project.title}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
              <dt>Assignee</dt>
              <dd className="text-foreground">{task.assignee?.fullName ?? "Unassigned"}</dd>
              <dt>Due date</dt>
              <dd className="text-foreground">
                {task.dueDate ? format(task.dueDate, "MMM d, yyyy") : "—"}
              </dd>
              <dt>Created by</dt>
              <dd className="text-foreground">{task.createdBy.fullName}</dd>
            </dl>
          </CardContent>
        </Card>

        {canUpdateStatus ? (
          <Card>
            <CardHeader>
              <CardTitle>Update status</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskStatusForm
                // Remount whenever the server-confirmed status/notes change
                // (e.g. after a successful update) — this form uses an
                // uncontrolled Select, and Base UI warns if defaultValue
                // changes on an already-initialized instance instead of a
                // fresh mount.
                key={`${task.status}:${task.completionNotes ?? ""}`}
                taskId={task.id}
                status={task.status}
                completionNotes={task.completionNotes}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
