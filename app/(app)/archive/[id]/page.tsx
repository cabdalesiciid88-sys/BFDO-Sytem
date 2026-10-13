import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { getMediaDetail } from "@/features/archive/queries";
import { submitMediaForApproval } from "@/features/archive/actions";
import { canEditMediaMetadata } from "@/lib/permissions/media-access";
import { CAN_UPLOAD_MEDIA } from "@/lib/permissions/roles";
import { ForbiddenError } from "@/lib/permissions/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const APPROVAL_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
  REVOKED: "secondary",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function MediaDetailPage({
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
  const canSubmit =
    CAN_UPLOAD_MEDIA.has(user.role) && (!media.approval || media.approval.status === "REJECTED");

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{media.originalFilename}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline">{media.category}</Badge>
            {media.approval ? (
              <Badge variant={APPROVAL_VARIANT[media.approval.status] ?? "outline"}>
                {media.approval.status}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit ? (
            <Button variant="outline" nativeButton={false} render={<Link href={`/archive/${media.id}/edit`} />}>
              Edit
            </Button>
          ) : null}
          <Button variant="outline" nativeButton={false} render={<a href={`/api/media/${media.id}`} />}>
            Download
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardContent className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-muted">
            {media.category === "PHOTO" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/media/${media.id}`}
                alt={media.originalFilename}
                className="size-full object-contain"
              />
            ) : (
              <FileText className="size-16 text-muted-foreground" />
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {media.description ? (
              <p className="whitespace-pre-wrap">{media.description}</p>
            ) : (
              <p className="text-muted-foreground">No description.</p>
            )}
            <dl className="grid grid-cols-2 gap-2 pt-2 text-muted-foreground">
              <dt>Uploaded by</dt>
              <dd className="text-foreground">{media.uploader.fullName}</dd>
              <dt>Uploaded</dt>
              <dd className="text-foreground">{format(media.uploadedAt, "MMM d, yyyy")}</dd>
              <dt>File size</dt>
              <dd className="text-foreground">{formatBytes(media.fileSizeBytes)}</dd>
              <dt>Type</dt>
              <dd className="text-foreground">{media.mimeType}</dd>
              {media.keywords ? (
                <>
                  <dt>Keywords</dt>
                  <dd className="text-foreground">{media.keywords}</dd>
                </>
              ) : null}
            </dl>
            {media.projectMedia.length > 0 ? (
              <div>
                <p className="font-medium">Projects</p>
                <ul className="list-inside list-disc text-muted-foreground">
                  {media.projectMedia.map((pm) => (
                    <li key={pm.id}>
                      <Link href={`/projects/${pm.project.id}`} className="hover:underline">
                        {pm.project.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {media.activityMedia.length > 0 ? (
              <div>
                <p className="font-medium">Activities</p>
                <ul className="list-inside list-disc text-muted-foreground">
                  {media.activityMedia.map((am) => (
                    <li key={am.id}>
                      <Link href={`/activities/${am.activity.id}`} className="hover:underline">
                        {am.activity.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {canSubmit ? (
        <Card>
          <CardHeader>
            <CardTitle>Public gallery</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={submitMediaForApproval.bind(null, media.id)}>
              <Button type="submit">Submit for public gallery</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
