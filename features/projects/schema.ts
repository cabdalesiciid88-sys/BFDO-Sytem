import { z } from "zod";

// A conditionally-rendered field (e.g. the admin-only manager picker) is
// simply absent from the DOM at submit time, so FormData.get() returns
// null, not "" — both must collapse to undefined for an .optional() field.
const emptyToUndefined = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "") ? undefined : v;

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const optionalDate = z.preprocess(
  emptyToUndefined,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date").optional(),
);

export const PROJECT_STATUS_VALUES = [
  "PLANNED",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "ARCHIVED",
] as const;

export const projectFieldsSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: optionalText(5000),
  objectives: optionalText(5000),
  category: optionalText(100),
  location: optionalText(200),
  startDate: optionalDate,
  endDate: optionalDate,
});

export const createProjectSchema = projectFieldsSchema.extend({
  // Only honored when the acting user is SYSTEM_ADMIN — a Project Manager
  // creating a project always becomes its manager. See features/projects/actions.ts.
  managerId: z.preprocess(emptyToUndefined, z.string().trim().optional()),
});

export const updateProjectSchema = projectFieldsSchema.extend({
  status: z.enum(PROJECT_STATUS_VALUES),
});

export const addMemberSchema = z.object({
  userId: z.string().trim().min(1, "Select a user"),
  roleInProject: z.enum(["MANAGER", "COORDINATOR", "MEMBER"]),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
