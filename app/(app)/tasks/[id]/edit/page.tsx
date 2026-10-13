import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { getTaskDetail, listTaskableProjects } from "@/features/tasks/queries";
import { listActiveUsers } from "@/lib/users/queries";
import { canManageTask } from "@/lib/permissions/task-access";
import { ForbiddenError } from "@/lib/permissions/errors";
import { TaskForm } from "@/features/tasks/components/task-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Edit task — BFDO Management System" };

export default async function EditTaskPage({
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
  if (!(await canManageTask(user, task))) notFound();

  const [projects, users] = await Promise.all([listTaskableProjects(user), listActiveUsers()]);

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Edit task</h1>
      <Card>
        <CardHeader>
          <CardTitle>{task.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskForm mode="edit" task={task} projects={projects} users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
