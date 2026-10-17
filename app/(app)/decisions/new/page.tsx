import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { listMeetableProjects } from "@/features/meetings/queries";
import { listActiveUsers } from "@/lib/users/queries";
import { DecisionForm } from "@/features/decisions/components/decision-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";
import { CAN_RECORD_MEETINGS } from "@/lib/permissions/roles";

export const metadata = { title: "Record decision — BFDO Management System" };

export default async function NewDecisionPage() {
  const user = await requireUser();
  if (!CAN_RECORD_MEETINGS.has(user.role)) notFound();

  const [projects, users] = await Promise.all([listMeetableProjects(user), listActiveUsers()]);
  if (user.role !== "SYSTEM_ADMIN" && projects.length === 0) notFound();

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Record decision" />
      <Card>
        <CardHeader>
          <CardTitle>Decision details</CardTitle>
        </CardHeader>
        <CardContent>
          <DecisionForm mode="create-standalone" projects={projects} users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
