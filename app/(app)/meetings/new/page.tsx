import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { listMeetableProjects } from "@/features/meetings/queries";
import { listActiveUsers } from "@/lib/users/queries";
import { MeetingForm } from "@/features/meetings/components/meeting-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";
import { CAN_RECORD_MEETINGS } from "@/lib/permissions/roles";

export const metadata = { title: "Record meeting — BFDO Management System" };

export default async function NewMeetingPage() {
  const user = await requireUser();
  if (!CAN_RECORD_MEETINGS.has(user.role)) notFound();

  const [projects, users] = await Promise.all([listMeetableProjects(user), listActiveUsers()]);
  if (user.role !== "SYSTEM_ADMIN" && projects.length === 0) notFound();

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Record meeting" />
      <Card>
        <CardHeader>
          <CardTitle>Meeting details</CardTitle>
        </CardHeader>
        <CardContent>
          <MeetingForm mode="create" projects={projects} users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
