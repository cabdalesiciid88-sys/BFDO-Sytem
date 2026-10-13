import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth/current-user";
import { CAN_VIEW_ORG_WIDE, CAN_VIEW_REPORTS } from "@/lib/permissions/roles";
import {
  getActivitiesReport,
  getArchiveUploadsReport,
  getGalleryApprovalsReport,
  getTaskStatusReport,
  listReportableProjects,
} from "@/features/reports/queries";
import { listActivityCategories } from "@/features/activities/queries";
import { reportFiltersSchema, type ReportType } from "@/features/reports/schema";
import type { ApprovalStatus, MediaCategory, Role } from "@prisma/client";
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

export const metadata = { title: "Reports — BFDO Management System" };

const nativeSelectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const REPORT_LABELS: Record<ReportType, string> = {
  activities: "Activities",
  tasks: "Task status",
  archive: "Archive uploads",
  gallery: "Gallery approvals",
};

type SearchParams = {
  type?: string;
  from?: string;
  to?: string;
  projectId?: string;
  category?: string;
  status?: string;
};

function buildQuery(params: SearchParams): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  return qs.toString();
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  if (!CAN_VIEW_REPORTS.has(user.role)) notFound();

  const raw = await searchParams;
  const orgWide = CAN_VIEW_ORG_WIDE.has(user.role);
  const requestedType = raw.type && raw.type in REPORT_LABELS ? raw.type : "activities";
  const type = (requestedType === "gallery" && !orgWide ? "activities" : requestedType) as ReportType;

  const parsed = reportFiltersSchema.safeParse({ ...raw, type });
  const filters = parsed.success
    ? parsed.data
    : { type, from: undefined, to: undefined, projectId: undefined, category: undefined, status: undefined };

  const [projects, categories] = await Promise.all([
    listReportableProjects(user),
    listActivityCategories(),
  ]);

  const tabs: ReportType[] = orgWide
    ? ["activities", "tasks", "archive", "gallery"]
    : ["activities", "tasks", "archive"];

  const exportQuery = buildQuery({
    type,
    from: raw.from,
    to: raw.to,
    projectId: filters.projectId,
    category: filters.category,
    status: filters.status,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Report data is always computed live — nothing here is cached.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map((t) => (
          <Button
            key={t}
            size="sm"
            variant={t === type ? "default" : "outline"}
            nativeButton={false}
            render={<Link href={`/reports?type=${t}`} />}
          >
            {REPORT_LABELS[t]}
          </Button>
        ))}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="type" value={type} />

        {type !== "gallery" ? (
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Project</label>
            <select
              name="projectId"
              defaultValue={filters.projectId ?? ""}
              className={nativeSelectClassName + " w-48"}
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {type === "activities" ? (
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Category</label>
            <select
              name="category"
              defaultValue={filters.category ?? ""}
              className={nativeSelectClassName + " w-40"}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {type === "archive" ? (
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Category</label>
            <select
              name="category"
              defaultValue={filters.category ?? ""}
              className={nativeSelectClassName + " w-40"}
            >
              <option value="">All categories</option>
              <option value="PHOTO">Photo</option>
              <option value="DOCUMENT">Document</option>
              <option value="VIDEO">Video</option>
              <option value="REPORT">Report</option>
            </select>
          </div>
        ) : null}

        {type === "gallery" ? (
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Status</label>
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className={nativeSelectClassName + " w-40"}
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="REVOKED">Revoked</option>
            </select>
          </div>
        ) : null}

        {type !== "tasks" ? (
          <>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">From</label>
              <Input type="date" name="from" defaultValue={raw.from ?? ""} className="w-40" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">To</label>
              <Input type="date" name="to" defaultValue={raw.to ?? ""} className="w-40" />
            </div>
          </>
        ) : null}

        <Button type="submit" variant="outline">
          Filter
        </Button>
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={<a href={`/api/reports/export?${exportQuery}`} />}
        >
          Export CSV
        </Button>
      </form>

      {type === "activities" ? <ActivitiesReportView user={user} filters={filters} /> : null}
      {type === "tasks" ? <TaskStatusReportView user={user} filters={filters} /> : null}
      {type === "archive" ? <ArchiveReportView user={user} filters={filters} /> : null}
      {type === "gallery" ? <GalleryReportView user={user} filters={filters} /> : null}
    </div>
  );
}

type ViewUser = { id: string; role: Role };
type ViewFilters = {
  from?: Date;
  to?: Date;
  projectId?: string;
  category?: string;
  status?: string;
};

async function ActivitiesReportView({ user, filters }: { user: ViewUser; filters: ViewFilters }) {
  const { rows, summaryByCategory } = await getActivitiesReport(user, filters);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {Array.from(summaryByCategory.entries()).map(([category, count]) => (
          <Badge key={category} variant="outline">
            {category}: {count}
          </Badge>
        ))}
        <Badge>{rows.length} total</Badge>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Responsible</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No activities match these filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.referenceCode}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{row.project?.title ?? "—"}</TableCell>
                  <TableCell>{row.category ?? "—"}</TableCell>
                  <TableCell>{row.responsible.fullName}</TableCell>
                  <TableCell>{format(row.activityDate, "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

async function TaskStatusReportView({ user, filters }: { user: ViewUser; filters: ViewFilters }) {
  const { rows, summaryByStatus } = await getTaskStatusReport(user, filters);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {Array.from(summaryByStatus.entries()).map(([status, count]) => (
          <Badge key={status} variant="outline">
            {status.replaceAll("_", " ")}: {count}
          </Badge>
        ))}
        <Badge>{rows.length} total</Badge>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No tasks match these filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{row.project?.title ?? "—"}</TableCell>
                  <TableCell>{row.assignee?.fullName ?? "Unassigned"}</TableCell>
                  <TableCell>{row.priority}</TableCell>
                  <TableCell>{row.status.replaceAll("_", " ")}</TableCell>
                  <TableCell>{row.dueDate ? format(row.dueDate, "MMM d, yyyy") : "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

async function ArchiveReportView({ user, filters }: { user: ViewUser; filters: ViewFilters }) {
  const { rows, summaryByCategory } = await getArchiveUploadsReport(user, {
    ...filters,
    category: filters.category as MediaCategory | undefined,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {Array.from(summaryByCategory.entries()).map(([category, count]) => (
          <Badge key={category} variant="outline">
            {category}: {count}
          </Badge>
        ))}
        <Badge>{rows.length} total</Badge>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Filename</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Uploaded by</TableHead>
              <TableHead>Uploaded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No files match these filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.originalFilename}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{row.projectMedia.map((pm) => pm.project.title).join(", ") || "—"}</TableCell>
                  <TableCell>{row.uploader.fullName}</TableCell>
                  <TableCell>{format(row.uploadedAt, "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

async function GalleryReportView({ user, filters }: { user: ViewUser; filters: ViewFilters }) {
  const { rows, summaryByStatus } = await getGalleryApprovalsReport(user, {
    ...filters,
    status: filters.status as ApprovalStatus | undefined,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {Array.from(summaryByStatus.entries()).map(([status, count]) => (
          <Badge key={status} variant="outline">
            {status}: {count}
          </Badge>
        ))}
        <Badge>{rows.length} total</Badge>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Filename</TableHead>
              <TableHead>Submitted by</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Reviewed by</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No submissions match these filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.mediaAsset.originalFilename}</TableCell>
                  <TableCell>{row.submittedBy.fullName}</TableCell>
                  <TableCell>{format(row.submittedAt, "MMM d, yyyy")}</TableCell>
                  <TableCell>{row.reviewedBy?.fullName ?? "—"}</TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
