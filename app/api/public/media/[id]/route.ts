import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { readStorageFile } from "@/lib/storage/file-io";
import { isPublicGalleryEnabled } from "@/features/gallery/queries";

/**
 * Anonymous, unauthenticated route — the only place outside the admin
 * review queue allowed to serve bytes without a session. Re-checks
 * `media_approvals.status = APPROVED` on every single request (never
 * trusts a cached public listing), per docs/permissions.md hard rule 5.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isPublicGalleryEnabled())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await params;

  const media = await prisma.mediaAsset.findUnique({
    where: { id },
    include: { approval: { select: { status: true } } },
  });
  if (!media || media.approval?.status !== "APPROVED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await readStorageFile(media.storagePath);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": media.mimeType,
      "Content-Disposition": "inline",
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
