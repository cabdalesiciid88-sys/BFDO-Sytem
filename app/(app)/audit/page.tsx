import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth/current-user";
import { CAN_VIEW_AUDIT_LOGS } from "@/lib/permissions/roles";
import { listAuditLogs, listAuditTargetTypes } from "@/features/audit/queries";
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

export const metadata = { title: "Audit Logs — BFDO Management System" };

const nativeSelectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

type SearchParams = {
  actor?: string;
  action?: string;
  targetType?: string;
  from?: string;
  to?: string;
  page?: string;
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  if (!CAN_VIEW_AUDIT_LOGS.has(user.role)) notFound();

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [{ rows, total, pageCount }, targetTypes] = await Promise.all([
    listAuditLogs(
      {
        actorSearch: params.actor,
        action: params.action,
        targetType: params.targetType,
        from: params.from ? new Date(params.from) : undefined,
        to: params.to ? new Date(params.to) : undefined,
      },
      page,
    ),
    listAuditTargetTypes(),
  ]);

  const baseQuery = new URLSearchParams();
  if (params.actor) baseQuery.set("actor", params.actor);
  if (params.action) baseQuery.set("action", params.action);
  if (params.targetType) baseQuery.set("targetType", params.targetType);
  if (params.from) baseQuery.set("from", params.from);
  if (params.to) baseQuery.set("to", params.to);

  function pageHref(p: number) {
    const q = new URLSearchParams(baseQuery);
    q.set("page", String(p));
    return `/audit?${q.toString()}`;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit Logs"
        description={`${total} event${total === 1 ? "" : "s"} — append-only, admin-only.`}
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="min-w-48">
          <label className="mb-1 block text-xs text-muted-foreground">Actor</label>
          <Input name="actor" placeholder="Name or email…" defaultValue={params.actor ?? ""} />
        </div>
        <div className="min-w-48">
          <label className="mb-1 block text-xs text-muted-foreground">Action</label>
          <Input name="action" placeholder="e.g. user.create…" defaultValue={params.action ?? ""} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Target type</label>
          <select
            name="targetType"
            defaultValue={params.targetType ?? ""}
            className={nativeSelectClassName + " w-40"}
          >
            <option value="">All types</option>
            {targetTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">From</label>
          <Input type="date" name="from" defaultValue={params.from ?? ""} className="w-40" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">To</label>
          <Input type="date" name="to" defaultValue={params.to ?? ""} className="w-40" />
        </div>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No audit events match these filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const details = {
                  ...(row.metadata ? { metadata: row.metadata } : {}),
                  ...(row.beforeValue ? { before: row.beforeValue } : {}),
                  ...(row.afterValue ? { after: row.afterValue } : {}),
                };
                const hasDetails = Object.keys(details).length > 0;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(row.createdAt, "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>{row.actor?.fullName ?? "System"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.action}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.targetType}
                      {row.targetId ? ` #${row.targetId.slice(0, 8)}` : ""}
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-normal break-all text-xs text-muted-foreground">
                      {hasDetails ? JSON.stringify(details) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button size="sm" variant="outline" nativeButton={false} render={<Link href={pageHref(page - 1)} />}>
                Previous
              </Button>
            ) : null}
            {page < pageCount ? (
              <Button size="sm" variant="outline" nativeButton={false} render={<Link href={pageHref(page + 1)} />}>
                Next
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
