import { z } from "zod";

// A conditionally-rendered field is simply absent from the DOM at submit
// time, so FormData.get() returns null, not "" — both must collapse to
// undefined for an .optional() field.
const emptyToUndefined = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "") ? undefined : v;

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

export const TASK_STATUS_VALUES = ["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED"] as const;
export const TASK_PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const taskFieldsSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: optionalText(5000),
  projectId: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  assigneeId: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  priority: z.enum(TASK_PRIORITY_VALUES),
  dueDate: z.preprocess(
    emptyToUndefined,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date").optional(),
  ),
});

export const createTaskSchema = taskFieldsSchema;

export const updateTaskSchema = taskFieldsSchema.extend({
  status: z.enum(TASK_STATUS_VALUES),
  completionNotes: optionalText(5000),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(TASK_STATUS_VALUES),
  completionNotes: optionalText(5000),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
