import { z } from "zod";

// A conditionally-rendered field is simply absent from the DOM at submit
// time, so FormData.get() returns null, not "" — both must collapse to
// undefined for an .optional() field.
const emptyToUndefined = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "") ? undefined : v;

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

// Media scope v1 is images and documents only — VIDEO exists in the Prisma
// enum for forward compatibility but isn't user-selectable yet (see
// lib/storage/validate-upload.ts and docs/project-status.md).
export const MEDIA_CATEGORY_VALUES = ["PHOTO", "DOCUMENT", "REPORT"] as const;

export const uploadMediaSchema = z.object({
  category: z.enum(MEDIA_CATEGORY_VALUES),
  description: optionalText(2000),
  keywords: optionalText(500),
  projectId: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  activityId: z.preprocess(emptyToUndefined, z.string().trim().optional()),
});

export const updateMediaSchema = z.object({
  description: optionalText(2000),
  keywords: optionalText(500),
});

export type UploadMediaInput = z.infer<typeof uploadMediaSchema>;
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;
