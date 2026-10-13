import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/current-user";
import { requireCanViewMedia } from "@/lib/permissions/media-access";
import { ForbiddenError } from "@/lib/permissions/errors";
import { readStorageFile } from "@/lib/storage/file-io";

/** Same access rules as app/api/media/[id]/route.ts, serving the smaller
 *  thumbnail (inline, not a download) for grid previews. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;

  const media = await prisma.mediaAsset.findUnique({
    where: { id },
    include: { projectMedia: { select: { projectId: true } } },
  });
  if (!media || !media.thumbnailPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await requireCanViewMedia(user, {
      id: media.id,
      uploaderId: media.uploaderId,
      projectIds: media.projectMedia.map((pm) => pm.projectId),
    });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw err;
  }

  const buffer = await readStorageFile(media.thumbnailPath);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": "inline",
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, no-store",
    },
  });
}
