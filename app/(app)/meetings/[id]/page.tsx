import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth/current-user";
import { getMeetingDetail } from "@/features/meetings/queries";
import { canManageMeeting } from "@/lib/permissions/meeting-access";
import { listActiveUsers } from "@/lib/users/queries";
import { ForbiddenError } from "@/lib/permissions/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DecisionForm } from "@/features/decisions/components/decision-form";

export default async function MeetingDetailPage({
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

  const canManage = await canManageMeeting(user, meeting);
  const users = canManage ? await listActiveUsers() : [];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{meeting.title}</h1>
          <p className="text-sm text-muted-foreground">{format(meeting.heldAt, "MMM d, yyyy p")}</p>
        </div>
        {canManage ? (
          <Button variant="outline" nativeButton={false} render={<Link href={`/meetings/${meeting.id}/edit`} />}>
            Edit
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <dl className="grid grid-cols-2 gap-2 text-muted-foreground">
              <dt>Project</dt>
              <dd className="text-foreground">
                {meeting.project ? (
                  <Link href={`/projects/${meeting.project.id}`} className="hover:underline">
                    {meeting.project.title}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
              <dt>Location</dt>
              <dd className="text-foreground">{meeting.location ?? "—"}</dd>
              <dt>Method</dt>
              <dd className="text-foreground">{meeting.method ?? "—"}</dd>
              <dt>Recorded by</dt>
              <dd className="text-foreground">{meeting.createdBy.fullName}</dd>
            </dl>
            {meeting.agenda ? (
              <div>
                <p className="font-medium">Agenda</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{meeting.agenda}</p>
              </div>
            ) : null}
            {meeting.notes ? (
              <div>
                <p className="font-medium">Notes</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{meeting.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Participants</CardTitle>
          </CardHeader>
          <CardContent>
            {meeting.participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No participants recorded.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {meeting.participants.map((p) => (
                  <li key={p.user.id}>{p.user.fullName}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Decisions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {meeting.decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No decisions recorded for this meeting.</p>
          ) : (
            <ul className="space-y-2">
              {meeting.decisions.map((decision) => (
                <li key={decision.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/decisions/${decision.id}`} className="font-medium hover:underline">
                      {decision.description}
                    </Link>
                    <Badge variant={decision.status === "COMPLETED" ? "secondary" : "default"}>
                      {decision.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    Responsible: {decision.responsible.fullName} · {format(decision.decidedAt, "MMM d, yyyy")}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {canManage ? (
            <div className="border-t pt-4">
              <h2 className="mb-2 text-sm font-medium">Record a new decision</h2>
              <DecisionForm mode="create-for-meeting" meetingId={meeting.id} users={users} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
