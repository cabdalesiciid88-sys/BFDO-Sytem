import { NextResponse, type NextRequest } from "next/server";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth/current-user";
import { CAN_VIEW_REPORTS } from "@/lib/permissions/roles";
import { ForbiddenError } from "@/lib/permissions/errors";
import { prisma } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/audit/log";
import { toCsv } from "@/lib/reports/csv";
import { reportFiltersSchema } from "@/features/reports/schema";
import {
  getActivitiesReport,
  getArchiveUploadsReport,
  getGalleryApprovalsReport,
  getTaskStatusReport,
} from "@/features/reports/queries";
import type { ApprovalStatus, MediaCategory } from "@prisma/client";

/**
 * Re-runs the exact same permission-scoped query functions the /reports
 * page renders from — there is no separate, less-guarded export path
 * (docs/project-status.md Phase 5 requirement: CSV export enforces the
 * same permission checks as the source data).
 */
export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (!CAN_VIEW_REPORTS.has(user.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = reportFiltersSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid report filters" }, { status: 400 });
  }
  const filters = parsed.data;

  let csv: string;
  let filenamePrefix: string;

  try {
    switch (filters.type) {
      case "activities": {
        const { rows } = await getActivitiesReport(user, filters);
        csv = toCsv(
          ["Reference", "Title", "Project", "Category", "Responsible", "Date"],
          rows.map((r) => [
            r.referenceCode,
            r.title,
            r.project?.title ?? "",
            r.category ?? "",
            r.responsible.fullName,
            format(r.activityDate, "yyyy-MM-dd"),
          ]),
        );
        filenamePrefix = "activities";
        break;
      }
      case "tasks": {
        const { rows } = await getTaskStatusReport(user, filters);
        csv = toCsv(
          ["Title", "Project", "Assignee", "Priority", "Status", "Due date"],
          rows.map((r) => [
            r.title,
            r.project?.title ?? "",
            r.assignee?.fullName ?? "",
            r.priority,
            r.status,
            r.dueDate ? format(r.dueDate, "yyyy-MM-dd") : "",
          ]),
        );
        filenamePrefix = "task-status";
        break;
      }
      case "archive": {
        const { rows } = await getArchiveUploadsReport(user, {
          ...filters,
          category: filters.category as MediaCategory | undefined,
        });
        csv = toCsv(
          ["Filename", "Category", "Project", "Uploaded by", "Uploaded"],
          rows.map((r) => [
            r.originalFilename,
            r.category,
            r.projectMedia.map((pm) => pm.project.title).join("; "),
            r.uploader.fullName,
            format(r.uploadedAt, "yyyy-MM-dd"),
          ]),
        );
        filenamePrefix = "archive-uploads";
        break;
      }
      case "gallery": {
        const { rows } = await getGalleryApprovalsReport(user, {
          ...filters,
          status: filters.status as ApprovalStatus | undefined,
        });
        csv = toCsv(
          ["Filename", "Submitted by", "Submitted", "Reviewed by", "Status"],
          rows.map((r) => [
            r.mediaAsset.originalFilename,
            r.submittedBy.fullName,
            format(r.submittedAt, "yyyy-MM-dd"),
            r.reviewedBy?.fullName ?? "",
            r.status,
          ]),
        );
        filenamePrefix = "gallery-approvals";
        break;
      }
    }
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw err;
  }

  const report = await prisma.report.create({
    data: {
      title: `${filenamePrefix} export`,
      reportType: filters.type,
      parameters: JSON.parse(JSON.stringify(filters)),
      projectId: filters.projectId ?? null,
      generatedById: user.id,
    },
  });

  await recordAuditLog({
    actorId: user.id,
    action: "report.export",
    targetType: "Report",
    targetId: report.id,
    metadata: { reportType: filters.type },
  });

  const filename = `${filenamePrefix}-${format(new Date(), "yyyy-MM-dd")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
