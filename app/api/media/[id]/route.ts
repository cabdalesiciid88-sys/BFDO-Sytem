import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/current-user";
import { requireCanViewMedia } from "@/lib/permissions/media-access";
import { ForbiddenError } from "@/lib/permissions/errors";
import { readStorageFile } from "@/lib/storage/file-io";

/**
 * Serves an original file to an authenticated, authorized user. Every
 * request re-checks permission for this specific asset — there is no
 * "public storage bucket" shortcut (docs/security.md "File access"). A
 * forbidden asset 404s rather than 403s, so guessing another project's
 * media ID can't confirm it exists (docs/permissions.md hard rule 4).
 */
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
  if (!media) {
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

  const buffer = await readStorageFile(media.storagePath);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": media.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(media.originalFilename)}"`,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, no-store",
    },
  });
}
