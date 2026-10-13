import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { getDecisionDetail } from "@/features/decisions/queries";
import { listActiveUsers } from "@/lib/users/queries";
import { canManageDecision } from "@/lib/permissions/meeting-access";
import { ForbiddenError } from "@/lib/permissions/errors";
import { DecisionForm } from "@/features/decisions/components/decision-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Edit decision — BFDO Management System" };

export default async function EditDecisionPage({
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
  if (!(await canManageDecision(user, decision))) notFound();

  const users = await listActiveUsers();

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Edit decision</h1>
      <Card>
        <CardHeader>
          <CardTitle>{decision.description}</CardTitle>
        </CardHeader>
        <CardContent>
          <DecisionForm mode="edit" decision={decision} users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
