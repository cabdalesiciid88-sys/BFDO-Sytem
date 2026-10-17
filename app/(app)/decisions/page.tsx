import Link from "next/link";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth/current-user";
import { listDecisions } from "@/features/decisions/queries";
import { listMeetableProjects } from "@/features/meetings/queries";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DecisionStatus } from "@prisma/client";

export const metadata = { title: "Decisions — BFDO Management System" };

const nativeSelectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function DecisionsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; projectId?: string; status?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const [decisions, creatableProjects] = await Promise.all([
    listDecisions(user, {
      search: params.search,
      projectId: params.projectId,
      status: params.status as DecisionStatus | undefined,
    }),
    listMeetableProjects(user),
  ]);

  const canCreate = user.role === "SYSTEM_ADMIN" || creatableProjects.length > 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Decisions"
        description={`${decisions.length} decision${decisions.length === 1 ? "" : "s"}`}
        actions={
          canCreate ? (
            <Button nativeButton={false} render={<Link href="/decisions/new" />}>
              Record decision
            </Button>
          ) : undefined
        }
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-48">
          <Input name="search" placeholder="Search description…" defaultValue={params.search ?? ""} />
        </div>
        {creatableProjects.length > 0 ? (
          <select
            name="projectId"
            defaultValue={params.projectId ?? ""}
            className={nativeSelectClassName + " w-48"}
          >
            <option value="">All projects</option>
            {creatableProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        ) : null}
        <select name="status" defaultValue={params.status ?? ""} className={nativeSelectClassName + " w-36"}>
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Responsible</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {decisions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No decisions match these filters.
                </TableCell>
              </TableRow>
            ) : (
              decisions.map((decision) => (
                <TableRow key={decision.id}>
                  <TableCell>{format(decision.decidedAt, "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <Link href={`/decisions/${decision.id}`} className="font-medium hover:underline">
                      {decision.description}
                    </Link>
                  </TableCell>
                  <TableCell>{decision.project?.title ?? "—"}</TableCell>
                  <TableCell>{decision.responsible.fullName}</TableCell>
                  <TableCell>
                    <Badge variant={decision.status === "COMPLETED" ? "secondary" : "default"}>
                      {decision.status.replaceAll("_", " ")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
