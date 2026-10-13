import Link from "next/link";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth/current-user";
import { getDashboardMetrics } from "@/features/dashboard/queries";
import { StatusBarChart } from "@/components/charts/status-bar-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Dashboard — BFDO Management System",
};

const PROJECT_STATUS_ORDER = ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"] as const;
const TASK_STATUS_ORDER = ["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED"] as const;

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "destructive";
}) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={tone === "destructive" && value > 0 ? "text-2xl font-semibold text-destructive" : "text-2xl font-semibold"}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const metrics = await getDashboardMetrics(user);

  const totalProjects = Object.values(metrics.projectsByStatus).reduce((a, b) => a + b, 0);
  const totalTasks = Object.values(metrics.tasksByStatus).reduce((a, b) => a + b, 0);

  const projectChartData = PROJECT_STATUS_ORDER.map((status) => ({
    label: status.replaceAll("_", " "),
    value: metrics.projectsByStatus[status] ?? 0,
  }));
  const taskChartData = TASK_STATUS_ORDER.map((status) => ({
    label: status.replaceAll("_", " "),
    value: metrics.tasksByStatus[status] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.fullName}</h1>
        <p className="text-sm text-muted-foreground">
          You&apos;re signed in as {user.role.replaceAll("_", " ").toLowerCase()}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Projects" value={totalProjects} />
        <StatTile label="Activities" value={metrics.activityCount} />
        <StatTile label="Tasks" value={totalTasks} />
        <StatTile label="Overdue tasks" value={metrics.overdueTaskCount} tone="destructive" />
        <StatTile label="Open decisions" value={metrics.openDecisionCount} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Projects by status</CardTitle>
          </CardHeader>
          <CardContent>
            {totalProjects === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              <StatusBarChart data={projectChartData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks by status</CardTitle>
          </CardHeader>
          <CardContent>
            {totalTasks === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks yet.</p>
            ) : (
              <StatusBarChart data={taskChartData} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My open tasks</CardTitle>
            <CardDescription>Tasks assigned to you that aren&apos;t completed yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{metrics.myOpenTaskCount}</p>
            <Link href="/tasks?onlyMine=1" className="text-sm text-muted-foreground hover:underline">
              View my tasks
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming meetings</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.upcomingMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming meetings scheduled.</p>
            ) : (
              <ul className="space-y-2">
                {metrics.upcomingMeetings.map((meeting) => (
                  <li key={meeting.id} className="text-sm">
                    <Link href={`/meetings/${meeting.id}`} className="font-medium hover:underline">
                      {meeting.title}
                    </Link>
                    <p className="text-muted-foreground">
                      {format(meeting.heldAt, "MMM d, yyyy p")}
                      {meeting.project ? ` · ${meeting.project.title}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
