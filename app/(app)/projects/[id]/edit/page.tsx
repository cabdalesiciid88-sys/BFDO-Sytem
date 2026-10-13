import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { getProjectDetail } from "@/features/projects/queries";
import { ForbiddenError } from "@/lib/permissions/errors";
import { requireProjectManager } from "@/lib/permissions/project-access";
import { ProjectForm } from "@/features/projects/components/project-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Edit project — BFDO Management System" };

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const project = await getProjectDetail(user, id).catch((err) => {
    if (err instanceof ForbiddenError) notFound();
    throw err;
  });
  if (!project) notFound();

  // Same existence check as the manage actions themselves — a Project
  // Manager who isn't this project's manager must see this page as 404.
  await requireProjectManager(user, project.id).catch(() => notFound());

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Edit project</h1>
      <Card>
        <CardHeader>
          <CardTitle>{project.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm mode="edit" project={project} />
        </CardContent>
      </Card>
    </div>
  );
}
