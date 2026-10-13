import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth/current-user";
import { getActivityDetail } from "@/features/activities/queries";
import { canEditActivity } from "@/lib/permissions/activity-access";
import { archiveActivity, unarchiveActivity } from "@/features/activities/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ForbiddenError } from "@/lib/permissions/errors";

export default async function ActivityDetailPage({
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

  const canEdit = await canEditActivity(user, activity);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{activity.referenceCode}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{activity.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={activity.status === "ARCHIVED" ? "destructive" : "default"}>
              {activity.status}
            </Badge>
            {activity.category ? (
              <span className="text-sm text-muted-foreground">{activity.category}</span>
            ) : null}
          </div>
        </div>
        {canEdit ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/activities/${activity.id}/edit`} />}>
              Edit
            </Button>
            {activity.status === "ARCHIVED" ? (
              <form action={unarchiveActivity.bind(null, activity.id)}>
                <Button type="submit" variant="outline">
                  Unarchive
                </Button>
              </form>
            ) : (
              <form action={archiveActivity.bind(null, activity.id)}>
                <Button type="submit" variant="destructive">
                  Archive
                </Button>
              </form>
            )}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {activity.description ? (
              <p className="whitespace-pre-wrap">{activity.description}</p>
            ) : (
              <p className="text-muted-foreground">No description.</p>
            )}
            {activity.outcomes ? (
              <div>
                <p className="font-medium">Outcomes</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{activity.outcomes}</p>
              </div>
            ) : null}
            <dl className="grid grid-cols-2 gap-2 pt-2 text-muted-foreground">
              <dt>Date</dt>
              <dd className="text-foreground">{format(activity.activityDate, "MMM d, yyyy")}</dd>
              <dt>Location</dt>
              <dd className="text-foreground">{activity.location ?? "—"}</dd>
              <dt>Project</dt>
              <dd className="text-foreground">
                {activity.project ? (
                  <Link href={`/projects/${activity.project.id}`} className="hover:underline">
                    {activity.project.title}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
              <dt>Responsible</dt>
              <dd className="text-foreground">{activity.responsible.fullName}</dd>
              <dt>Recorded by</dt>
              <dd className="text-foreground">{activity.createdBy.fullName}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Participants</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No participants recorded.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {activity.participants.map((p) => (
                  <li key={p.user.id}>{p.user.fullName}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
