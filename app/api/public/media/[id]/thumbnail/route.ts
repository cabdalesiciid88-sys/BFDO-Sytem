import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { readStorageFile } from "@/lib/storage/file-io";
import { isPublicGalleryEnabled } from "@/features/gallery/queries";

/** Same rules as app/api/public/media/[id]/route.ts, for gallery grid previews. */
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
  if (!media || media.approval?.status !== "APPROVED" || !media.thumbnailPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await readStorageFile(media.thumbnailPath);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": "inline",
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
