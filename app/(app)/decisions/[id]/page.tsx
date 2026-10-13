import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth/current-user";
import { getDecisionDetail } from "@/features/decisions/queries";
import { canManageDecision } from "@/lib/permissions/meeting-access";
import { ForbiddenError } from "@/lib/permissions/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DecisionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const decision = await getDecisionDetail(user, id).catch((err) => {
    if (err instanceof ForbiddenError) notFound();
    throw err;
  });
  if (!decision) notFound();

  const canManage = await canManageDecision(user, decision);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{decision.description}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={decision.status === "COMPLETED" ? "secondary" : "default"}>
              {decision.status.replaceAll("_", " ")}
            </Badge>
          </div>
        </div>
        {canManage ? (
          <Button variant="outline" nativeButton={false} render={<Link href={`/decisions/${decision.id}/edit`} />}>
            Edit
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <dl className="grid grid-cols-2 gap-2 text-muted-foreground">
            <dt>Decided on</dt>
            <dd className="text-foreground">{format(decision.decidedAt, "MMM d, yyyy")}</dd>
            <dt>Responsible</dt>
            <dd className="text-foreground">{decision.responsible.fullName}</dd>
            <dt>Project</dt>
            <dd className="text-foreground">
              {decision.project ? (
                <Link href={`/projects/${decision.project.id}`} className="hover:underline">
                  {decision.project.title}
                </Link>
              ) : (
                "—"
              )}
            </dd>
            <dt>Meeting</dt>
            <dd className="text-foreground">
              {decision.meeting ? (
                <Link href={`/meetings/${decision.meeting.id}`} className="hover:underline">
                  {decision.meeting.title}
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </dl>
          {decision.followUpAction ? (
            <div>
              <p className="font-medium">Follow-up action</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{decision.followUpAction}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
