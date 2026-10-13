import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { listApprovedApprovals, listPendingApprovals } from "@/features/gallery/queries";
import { approveMedia, rejectMedia, revokeMedia } from "@/features/gallery/actions";
import { CAN_REVIEW_PUBLIC_MEDIA } from "@/lib/permissions/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = { title: "Public gallery review — BFDO Management System" };

export default async function MediaReviewPage() {
  const user = await requireUser();
  if (!CAN_REVIEW_PUBLIC_MEDIA.has(user.role)) notFound();

  const [pending, approved] = await Promise.all([listPendingApprovals(), listApprovedApprovals()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Public gallery review</h1>
        <p className="text-sm text-muted-foreground">
          Approve, reject, or revoke submissions for the public media gallery.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending submissions ({pending.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending submissions.</p>
          ) : (
            pending.map((approval) => (
              <div key={approval.mediaAssetId} className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                    {approval.mediaAsset.category === "PHOTO" && approval.mediaAsset.thumbnailPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/media/${approval.mediaAsset.id}/thumbnail`}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <FileText className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/archive/${approval.mediaAsset.id}`} className="font-medium hover:underline">
                      {approval.mediaAsset.originalFilename}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Submitted by {approval.submittedBy.fullName} on{" "}
                      {format(approval.submittedAt, "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <form action={approveMedia.bind(null, approval.mediaAssetId)} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={`caption-${approval.mediaAssetId}`} className="text-xs">
                        Public caption
                      </Label>
                      <Input id={`caption-${approval.mediaAssetId}`} name="publicCaption" />
                    </div>
                    <Button type="submit" size="sm">
                      Approve
                    </Button>
                  </form>
                  <form action={rejectMedia.bind(null, approval.mediaAssetId)} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={`reason-${approval.mediaAssetId}`} className="text-xs">
                        Rejection reason
                      </Label>
                      <Input id={`reason-${approval.mediaAssetId}`} name="rejectionReason" />
                    </div>
                    <Button type="submit" variant="destructive" size="sm">
                      Reject
                    </Button>
                  </form>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Currently public ({approved.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {approved.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing is public yet.</p>
          ) : (
            approved.map((approval) => (
              <div
                key={approval.mediaAssetId}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <Link href={`/archive/${approval.mediaAsset.id}`} className="font-medium hover:underline">
                    {approval.mediaAsset.originalFilename}
                  </Link>
                  {approval.publicCaption ? (
                    <p className="text-xs text-muted-foreground">{approval.publicCaption}</p>
                  ) : null}
                </div>
                <form action={revokeMedia.bind(null, approval.mediaAssetId)}>
                  <Button type="submit" variant="destructive" size="sm">
                    Revoke
                  </Button>
                </form>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
