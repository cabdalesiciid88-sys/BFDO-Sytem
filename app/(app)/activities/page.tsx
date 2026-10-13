import Link from "next/link";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth/current-user";
import {
  listActivities,
  listActivityCategories,
  listCreatableProjects,
} from "@/features/activities/queries";
import { ActivityFilters } from "@/features/activities/components/activity-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Activity Register — BFDO Management System" };

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; category?: string; projectId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const [activities, categories, creatableProjects] = await Promise.all([
    listActivities(user, {
      search: params.search,
      status: params.status as "ACTIVE" | "ARCHIVED" | undefined,
      category: params.category,
      projectId: params.projectId,
    }),
    listActivityCategories(),
    listCreatableProjects(user),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activity Register</h1>
          <p className="text-sm text-muted-foreground">
            {activities.length} activit{activities.length === 1 ? "y" : "ies"}
          </p>
        </div>
        {creatableProjects.length > 0 || user.role === "SYSTEM_ADMIN" ? (
          <Button nativeButton={false} render={<Link href="/activities/new" />}>Record activity</Button>
        ) : null}
      </div>

      <ActivityFilters
        search={params.search}
        status={params.status}
        category={params.category}
        projectId={params.projectId}
        categories={categories}
        projects={creatableProjects}
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Responsible</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No activities match these filters.
                </TableCell>
              </TableRow>
            ) : (
              activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>{format(activity.activityDate, "MMM d, yyyy")}</TableCell>
                  <TableCell className="font-mono text-xs">{activity.referenceCode}</TableCell>
                  <TableCell>
                    <Link href={`/activities/${activity.id}`} className="font-medium hover:underline">
                      {activity.title}
                    </Link>
                  </TableCell>
                  <TableCell>{activity.project?.title ?? "—"}</TableCell>
                  <TableCell>{activity.responsible.fullName}</TableCell>
                  <TableCell>
                    <Badge variant={activity.status === "ARCHIVED" ? "destructive" : "default"}>
                      {activity.status}
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
