import Link from "next/link";
import { format } from "date-fns";
import { CheckSquare, FolderKanban, Gavel } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { getDashboardMetrics } from "@/features/dashboard/queries";
import { StatusBarChart } from "@/components/charts/status-bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";
import { HeroStatCard } from "@/components/dashboard/hero-stat-card";
import { ProgressCard } from "@/components/dashboard/progress-card";

export const metadata = {
  title: "Dashboard — BFDO Management System",
};

const PROJECT_STATUS_ORDER = ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"] as const;
const TASK_STATUS_ORDER = ["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED"] as const;

export default async function DashboardPage() {
  const user = await requireUser();
  const metrics = await getDashboardMetrics(user);

  const totalProjects = Object.values(metrics.projectsByStatus).reduce((a, b) => a + b, 0);
  const totalTasks = Object.values(metrics.tasksByStatus).reduce((a, b) => a + b, 0);
  const completedProjects =
    (metrics.projectsByStatus.COMPLETED ?? 0) + (metrics.projectsByStatus.ARCHIVED ?? 0);
  const completedTasks = metrics.tasksByStatus.COMPLETED ?? 0;
  const resolvedDecisions = metrics.totalDecisionCount - metrics.openDecisionCount;

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
      <PageHeader
        title={`Welcome, ${user.fullName}`}
        description={`You're signed in as ${user.role.replaceAll("_", " ").toLowerCase()}.`}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <HeroStatCard
          label="My open tasks"
          value={metrics.myOpenTaskCount}
          href="/tasks?onlyMine=1"
          tone="violet"
        />
        <HeroStatCard
          label="Overdue tasks"
          value={metrics.overdueTaskCount}
          href="/tasks?overdue=1"
          tone="pink"
        />
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ProgressCard
          label="Tasks completed"
          icon={CheckSquare}
          value={completedTasks}
          total={totalTasks}
          accent="violet"
        />
        <ProgressCard
          label="Projects completed"
          icon={FolderKanban}
          value={completedProjects}
          total={totalProjects}
          accent="neutral"
        />
        <ProgressCard
          label="Decisions resolved"
          icon={Gavel}
          value={resolvedDecisions}
          total={metrics.totalDecisionCount}
          accent="pink"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{metrics.activityCount}</p>
            <Link href="/activities" className="text-sm text-muted-foreground hover:underline">
              View activity register
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
