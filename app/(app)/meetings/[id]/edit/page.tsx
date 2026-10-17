import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { getMeetingDetail, listMeetableProjects } from "@/features/meetings/queries";
import { listActiveUsers } from "@/lib/users/queries";
import { canManageMeeting } from "@/lib/permissions/meeting-access";
import { ForbiddenError } from "@/lib/permissions/errors";
import { MeetingForm } from "@/features/meetings/components/meeting-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export const metadata = { title: "Edit meeting — BFDO Management System" };

export default async function EditMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const meeting = await getMeetingDetail(user, id).catch((err) => {
    if (err instanceof ForbiddenError) notFound();
    throw err;
  });
  if (!meeting) notFound();
  if (!(await canManageMeeting(user, meeting))) notFound();

  const [projects, users] = await Promise.all([listMeetableProjects(user), listActiveUsers()]);

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Edit meeting" />
      <Card>
        <CardHeader>
          <CardTitle>{meeting.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <MeetingForm mode="edit" meeting={meeting} projects={projects} users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
