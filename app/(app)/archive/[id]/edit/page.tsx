import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { getMediaDetail } from "@/features/archive/queries";
import { canEditMediaMetadata } from "@/lib/permissions/media-access";
import { ForbiddenError } from "@/lib/permissions/errors";
import { EditMetadataForm } from "@/features/archive/components/edit-metadata-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export const metadata = { title: "Edit file details — BFDO Management System" };

export default async function EditMediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const media = await getMediaDetail(user, id).catch((err) => {
    if (err instanceof ForbiddenError) notFound();
    throw err;
  });
  if (!media) notFound();

  const canEdit = await canEditMediaMetadata(user, {
    id: media.id,
    uploaderId: media.uploaderId,
    projectIds: media.projectMedia.map((pm) => pm.projectId),
  });
  if (!canEdit) notFound();

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Edit file details" />
      <Card>
        <CardHeader>
          <CardTitle>{media.originalFilename}</CardTitle>
        </CardHeader>
        <CardContent>
          <EditMetadataForm mediaId={media.id} description={media.description} keywords={media.keywords} />
        </CardContent>
      </Card>
    </div>
  );
}
