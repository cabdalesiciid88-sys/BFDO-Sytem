import Link from "next/link";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth/current-user";
import { listFilterableProjects, listTasks, listTaskableProjects } from "@/features/tasks/queries";
import { TaskFilters } from "@/features/tasks/components/task-filters";
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
import type { TaskPriority, TaskStatus } from "@prisma/client";

export const metadata = { title: "Tasks — BFDO Management System" };

const PRIORITY_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  LOW: "secondary",
  MEDIUM: "outline",
  HIGH: "default",
  URGENT: "destructive",
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    priority?: string;
    projectId?: string;
    onlyMine?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const [tasks, filterProjects, taskableProjects] = await Promise.all([
    listTasks(user, {
      search: params.search,
      status: params.status as TaskStatus | undefined,
      priority: params.priority as TaskPriority | undefined,
      projectId: params.projectId,
      onlyMine: params.onlyMine === "1",
    }),
    listFilterableProjects(user),
    listTaskableProjects(user),
  ]);

  const canCreate = user.role === "SYSTEM_ADMIN" || taskableProjects.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {tasks.length} task{tasks.length === 1 ? "" : "s"}
          </p>
        </div>
        {canCreate ? (
          <Button nativeButton={false} render={<Link href="/tasks/new" />}>
            New task
          </Button>
        ) : null}
      </div>

      <TaskFilters
        search={params.search}
        status={params.status}
        priority={params.priority}
        projectId={params.projectId}
        onlyMine={params.onlyMine}
        projects={filterProjects}
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No tasks match these filters.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <Link href={`/tasks/${task.id}`} className="font-medium hover:underline">
                      {task.title}
                    </Link>
                  </TableCell>
                  <TableCell>{task.project?.title ?? "—"}</TableCell>
                  <TableCell>{task.assignee?.fullName ?? "Unassigned"}</TableCell>
                  <TableCell>
                    <Badge variant={PRIORITY_VARIANT[task.priority] ?? "outline"}>
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>{task.dueDate ? format(task.dueDate, "MMM d, yyyy") : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={task.status === "COMPLETED" ? "secondary" : "default"}>
                      {task.status.replaceAll("_", " ")}
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
