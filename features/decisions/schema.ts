import { z } from "zod";

// A conditionally-rendered field is simply absent from the DOM at submit
// time, so FormData.get() returns null, not "" — both must collapse to
// undefined for an .optional() field.
const emptyToUndefined = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "") ? undefined : v;

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

export const DECISION_STATUS_VALUES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

const decisionFieldsSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(2000),
  decidedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"),
  responsibleId: z.string().trim().min(1, "Select a responsible person"),
  followUpAction: optionalText(2000),
});

// Project/meeting linkage is fixed at creation and not editable afterwards
// (see features/decisions/actions.ts) — keeps edit from needing to re-check
// create-style project-membership permissions on a changed project/meeting.
export const createDecisionSchema = decisionFieldsSchema.extend({
  projectId: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  meetingId: z.preprocess(emptyToUndefined, z.string().trim().optional()),
});

export const updateDecisionSchema = decisionFieldsSchema.extend({
  status: z.enum(DECISION_STATUS_VALUES),
});

export type CreateDecisionInput = z.infer<typeof createDecisionSchema>;
export type UpdateDecisionInput = z.infer<typeof updateDecisionSchema>;
