import "server-only";
import { fileTypeFromBuffer } from "file-type";
import type { MediaCategory } from "@prisma/client";

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 26_214_400);

// Media scope v1 is images and documents only (docs/project-status.md) —
// VIDEO exists in the schema enum for forward compatibility but has no
// upload path yet. Formats are also chosen for reliable magic-byte
// detection: plain-text formats like CSV have no signature file-type can
// verify, so they're deliberately excluded rather than trusted on
// extension/declared Content-Type alone (docs/security.md "File access").
const IMAGE_MIME_TO_EXT: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

const DOCUMENT_MIME_TO_EXT: Readonly<Record<string, string>> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

export type UploadValidationResult =
  | { ok: true; mimeType: string; extension: string }
  | { ok: false; error: string };

/**
 * Validates an uploaded file's actual content against the declared
 * category and the configured size cap. Always sniffs real magic bytes via
 * `file-type` — never trusts the browser's declared Content-Type or the
 * original filename's extension, per docs/security.md "File access".
 */
export async function validateUpload(
  buffer: Buffer,
  category: MediaCategory,
): Promise<UploadValidationResult> {
  if (buffer.byteLength === 0) {
    return { ok: false, error: "File is empty." };
  }
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `File exceeds the ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)}MB limit.`,
    };
  }
  if (category === "VIDEO") {
    return { ok: false, error: "Video uploads are not supported yet." };
  }

  const allowedMimeToExt = category === "PHOTO" ? IMAGE_MIME_TO_EXT : DOCUMENT_MIME_TO_EXT;
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected || !(detected.mime in allowedMimeToExt)) {
    return {
      ok: false,
      error:
        category === "PHOTO"
          ? "File must be a JPEG or PNG image."
          : "File must be a PDF, Word (.docx), or Excel (.xlsx) document.",
    };
  }

  return { ok: true, mimeType: detected.mime, extension: allowedMimeToExt[detected.mime] };
}
