import Link from "next/link";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth/current-user";
import { listMeetableProjects, listMeetings } from "@/features/meetings/queries";
import { MeetingFilters } from "@/features/meetings/components/meeting-filters";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Meetings — BFDO Management System" };

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; projectId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const [meetings, meetableProjects] = await Promise.all([
    listMeetings(user, { search: params.search, projectId: params.projectId }),
    listMeetableProjects(user),
  ]);

  const canCreate = user.role === "SYSTEM_ADMIN" || meetableProjects.length > 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Meetings"
        description={`${meetings.length} meeting${meetings.length === 1 ? "" : "s"}`}
        actions={
          canCreate ? (
            <Button nativeButton={false} render={<Link href="/meetings/new" />}>
              Record meeting
            </Button>
          ) : undefined
        }
      />

      <MeetingFilters search={params.search} projectId={params.projectId} projects={meetableProjects} />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Participants</TableHead>
              <TableHead>Decisions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meetings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No meetings match these filters.
                </TableCell>
              </TableRow>
            ) : (
              meetings.map((meeting) => (
                <TableRow key={meeting.id}>
                  <TableCell>{format(meeting.heldAt, "MMM d, yyyy p")}</TableCell>
                  <TableCell>
                    <Link href={`/meetings/${meeting.id}`} className="font-medium hover:underline">
                      {meeting.title}
                    </Link>
                  </TableCell>
                  <TableCell>{meeting.project?.title ?? "—"}</TableCell>
                  <TableCell>{meeting._count.participants}</TableCell>
                  <TableCell>{meeting._count.decisions}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
