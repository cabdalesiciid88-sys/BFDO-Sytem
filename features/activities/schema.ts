import { z } from "zod";

// A conditionally-rendered field is simply absent from the DOM at submit
// time, so FormData.get() returns null, not "" — both must collapse to
// undefined for an .optional() field.
const emptyToUndefined = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "") ? undefined : v;

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

export const ACTIVITY_STATUS_VALUES = ["ACTIVE", "ARCHIVED"] as const;

export const activityFieldsSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: optionalText(5000),
  category: optionalText(100),
  location: optionalText(200),
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"),
  projectId: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  responsibleId: z.string().trim().min(1, "Select a responsible person"),
  outcomes: optionalText(5000),
});

export const createActivitySchema = activityFieldsSchema;

export const updateActivitySchema = activityFieldsSchema.extend({
  status: z.enum(ACTIVITY_STATUS_VALUES),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
