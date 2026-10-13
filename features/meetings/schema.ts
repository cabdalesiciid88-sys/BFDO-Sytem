import { z } from "zod";

// A conditionally-rendered field is simply absent from the DOM at submit
// time, so FormData.get() returns null, not "" — both must collapse to
// undefined for an .optional() field.
const emptyToUndefined = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "") ? undefined : v;

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

export const meetingFieldsSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  heldAt: z.string().trim().min(1, "Enter a date and time"),
  location: optionalText(200),
  method: optionalText(100),
  agenda: optionalText(5000),
  notes: optionalText(5000),
  projectId: z.preprocess(emptyToUndefined, z.string().trim().optional()),
});

export const createMeetingSchema = meetingFieldsSchema;
export const updateMeetingSchema = meetingFieldsSchema;

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
