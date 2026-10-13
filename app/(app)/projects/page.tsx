import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { listProjectCategories, listProjects } from "@/features/projects/queries";
import { ProjectFilters } from "@/features/projects/components/project-filters";
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
import { CAN_CREATE_PROJECT } from "@/lib/permissions/roles";
import type { ProjectStatus } from "@prisma/client";

export const metadata = { title: "Projects — BFDO Management System" };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PLANNED: "outline",
  ACTIVE: "default",
  ON_HOLD: "secondary",
  COMPLETED: "secondary",
  ARCHIVED: "destructive",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; category?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const [projects, categories] = await Promise.all([
    listProjects(user, {
      search: params.search,
      status: params.status as ProjectStatus | undefined,
      category: params.category,
    }),
    listProjectCategories(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </p>
        </div>
        {CAN_CREATE_PROJECT.has(user.role) ? (
          <Button nativeButton={false} render={<Link href="/projects/new" />}>New project</Button>
        ) : null}
      </div>

      <ProjectFilters
        search={params.search}
        status={params.status}
        category={params.category}
        categories={categories}
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Members</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No projects match these filters.
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-mono text-xs">{project.referenceCode}</TableCell>
                  <TableCell>
                    <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                      {project.title}
                    </Link>
                  </TableCell>
                  <TableCell>{project.manager.fullName}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[project.status] ?? "outline"}>
                      {project.status.replaceAll("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{project.category ?? "—"}</TableCell>
                  <TableCell>{project._count.members}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
