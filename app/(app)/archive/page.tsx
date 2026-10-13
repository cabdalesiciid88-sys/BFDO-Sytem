import Link from "next/link";
import { FileText } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { listLinkableProjects, listMedia } from "@/features/archive/queries";
import { MediaFilters } from "@/features/archive/components/media-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CAN_UPLOAD_MEDIA } from "@/lib/permissions/roles";
import type { MediaCategory } from "@prisma/client";

export const metadata = { title: "Digital Archive — BFDO Management System" };

const APPROVAL_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
  REVOKED: "secondary",
};

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; projectId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const [items, projects] = await Promise.all([
    listMedia(user, {
      search: params.search,
      category: params.category as MediaCategory | undefined,
      projectId: params.projectId,
    }),
    listLinkableProjects(user),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Digital Archive</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} file{items.length === 1 ? "" : "s"}
          </p>
        </div>
        {CAN_UPLOAD_MEDIA.has(user.role) ? (
          <Button nativeButton={false} render={<Link href="/archive/upload" />}>
            Upload file
          </Button>
        ) : null}
      </div>

      <MediaFilters
        search={params.search}
        category={params.category}
        projectId={params.projectId}
        projects={projects}
      />

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No files match these filters.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/archive/${item.id}`}
              className="group block overflow-hidden rounded-lg border hover:border-foreground/30"
            >
              <div className="flex aspect-square items-center justify-center bg-muted">
                {item.category === "PHOTO" && item.thumbnailPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/media/${item.id}/thumbnail`}
                    alt={item.originalFilename}
                    className="size-full object-cover"
                  />
                ) : (
                  <FileText className="size-10 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1 p-2">
                <p className="truncate text-sm font-medium">{item.originalFilename}</p>
                <div className="flex flex-wrap items-center gap-1">
                  <Badge variant="outline">{item.category}</Badge>
                  {item.approval ? (
                    <Badge variant={APPROVAL_VARIANT[item.approval.status] ?? "outline"}>
                      {item.approval.status}
                    </Badge>
                  ) : null}
                </div>
                {item.projectMedia[0] ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {item.projectMedia[0].project.title}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
