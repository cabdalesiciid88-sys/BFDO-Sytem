import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { listTaskableProjects } from "@/features/tasks/queries";
import { listActiveUsers } from "@/lib/users/queries";
import { TaskForm } from "@/features/tasks/components/task-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";
import { CAN_CREATE_TASK } from "@/lib/permissions/roles";

export const metadata = { title: "New task — BFDO Management System" };

export default async function NewTaskPage() {
  const user = await requireUser();
  if (!CAN_CREATE_TASK.has(user.role)) notFound();

  const [projects, users] = await Promise.all([listTaskableProjects(user), listActiveUsers()]);
  if (user.role !== "SYSTEM_ADMIN" && projects.length === 0) notFound();

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="New task" />
      <Card>
        <CardHeader>
          <CardTitle>Task details</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskForm mode="create" projects={projects} users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
