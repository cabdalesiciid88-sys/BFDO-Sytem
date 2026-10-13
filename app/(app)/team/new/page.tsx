import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { listDepartments } from "@/features/team/queries";
import { UserForm } from "@/features/team/components/user-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CAN_MANAGE_USERS } from "@/lib/permissions/roles";

export const metadata = { title: "Add team member — BFDO Management System" };

export default async function NewTeamMemberPage() {
  const user = await requireUser();
  if (!CAN_MANAGE_USERS.has(user.role)) notFound();

  const departments = await listDepartments();

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Add team member</h1>
      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm mode="create" departments={departments} />
        </CardContent>
      </Card>
    </div>
  );
}
