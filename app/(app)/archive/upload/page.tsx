import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { listLinkableActivities, listLinkableProjects } from "@/features/archive/queries";
import { UploadForm } from "@/features/archive/components/upload-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CAN_UPLOAD_MEDIA } from "@/lib/permissions/roles";

export const metadata = { title: "Upload file — BFDO Management System" };

export default async function UploadMediaPage() {
  const user = await requireUser();
  if (!CAN_UPLOAD_MEDIA.has(user.role)) notFound();

  const [projects, activities] = await Promise.all([
    listLinkableProjects(user),
    listLinkableActivities(user),
  ]);

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Upload file</h1>
      <Card>
        <CardHeader>
          <CardTitle>File details</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadForm projects={projects} activities={activities} />
        </CardContent>
      </Card>
    </div>
  );
}
