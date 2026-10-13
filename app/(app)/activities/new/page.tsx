import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { listCreatableProjects } from "@/features/activities/queries";
import { listActiveUsers } from "@/lib/users/queries";
import { ActivityForm } from "@/features/activities/components/activity-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CAN_CREATE_ACTIVITY } from "@/lib/permissions/roles";

export const metadata = { title: "Record activity — BFDO Management System" };

export default async function NewActivityPage() {
  const user = await requireUser();
  if (!CAN_CREATE_ACTIVITY.has(user.role)) notFound();

  const [projects, users] = await Promise.all([listCreatableProjects(user), listActiveUsers()]);

  // Non-admins with no project membership have nowhere to file an activity
  // under (requireCanCreateActivity rejects a blank project for them).
  if (user.role !== "SYSTEM_ADMIN" && projects.length === 0) notFound();

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Record activity</h1>
      <Card>
        <CardHeader>
          <CardTitle>Activity details</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityForm
            mode="create"
            projects={projects}
            users={users}
            canLeaveProjectBlank={user.role === "SYSTEM_ADMIN"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
