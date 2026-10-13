import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { getUserDetail, listDepartments } from "@/features/team/queries";
import { UserForm } from "@/features/team/components/user-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CAN_MANAGE_USERS } from "@/lib/permissions/roles";

export const metadata = { title: "Edit team member — BFDO Management System" };

export default async function EditTeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requireUser();
  if (!CAN_MANAGE_USERS.has(currentUser.role)) notFound();

  const { id } = await params;
  const [target, departments] = await Promise.all([getUserDetail(id), listDepartments()]);
  if (!target) notFound();

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Edit team member</h1>
      <Card>
        <CardHeader>
          <CardTitle>{target.fullName}</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm mode="edit" targetUser={target} departments={departments} />
        </CardContent>
      </Card>
    </div>
  );
}
