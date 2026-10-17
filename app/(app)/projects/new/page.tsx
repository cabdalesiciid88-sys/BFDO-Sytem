import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { listActiveUsersForAssignment } from "@/features/projects/queries";
import { ProjectForm } from "@/features/projects/components/project-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";
import { CAN_CREATE_PROJECT } from "@/lib/permissions/roles";

export const metadata = { title: "New project — BFDO Management System" };

export default async function NewProjectPage() {
  const user = await requireUser();
  // Guessing this URL without permission must look identical to it not
  // existing (docs/permissions.md hard rule 4).
  if (!CAN_CREATE_PROJECT.has(user.role)) notFound();

  const isAdmin = user.role === "SYSTEM_ADMIN";
  const assignableUsers = isAdmin ? await listActiveUsersForAssignment() : [];

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="New project" />
      <Card>
        <CardHeader>
          <CardTitle>Project details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm mode="create" isAdmin={isAdmin} assignableUsers={assignableUsers} />
        </CardContent>
      </Card>
    </div>
  );
}
