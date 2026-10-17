import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { getActivityDetail, listCreatableProjects } from "@/features/activities/queries";
import { listActiveUsers } from "@/lib/users/queries";
import { canEditActivity } from "@/lib/permissions/activity-access";
import { ForbiddenError } from "@/lib/permissions/errors";
import { ActivityForm } from "@/features/activities/components/activity-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export const metadata = { title: "Edit activity — BFDO Management System" };

export default async function EditActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const activity = await getActivityDetail(user, id).catch((err) => {
    if (err instanceof ForbiddenError) notFound();
    throw err;
  });
  if (!activity) notFound();
  if (!(await canEditActivity(user, activity))) notFound();

  const [projects, users] = await Promise.all([listCreatableProjects(user), listActiveUsers()]);

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Edit activity" />
      <Card>
        <CardHeader>
          <CardTitle>{activity.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityForm
            mode="edit"
            activity={activity}
            projects={projects}
            users={users}
            canLeaveProjectBlank={user.role === "SYSTEM_ADMIN"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
