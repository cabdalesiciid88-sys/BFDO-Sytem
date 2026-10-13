import "server-only";
import { Jimp } from "jimp";

// Jimp is pure JS (no native binary) — deliberate choice over `sharp` given
// this app's shared-hosting deployment target; see docs/architecture.md
// "Known risk: any dependency with a native binary...".
const THUMBNAIL_MAX_DIMENSION = 400;

export async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  const image = await Jimp.read(buffer);
  image.scaleToFit({ w: THUMBNAIL_MAX_DIMENSION, h: THUMBNAIL_MAX_DIMENSION });
  return image.getBuffer("image/jpeg");
}
