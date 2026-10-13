import { z } from "zod";

const emptyToUndefined = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "") ? undefined : v;

export const updateOrgSettingsSchema = z.object({
  organizationName: z.string().trim().min(1, "Organization name is required").max(200),
  supportEmail: z.preprocess(
    emptyToUndefined,
    z.string().trim().toLowerCase().email("Enter a valid email address").optional(),
  ),
  publicGalleryEnabled: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

export type UpdateOrgSettingsInput = z.infer<typeof updateOrgSettingsSchema>;
