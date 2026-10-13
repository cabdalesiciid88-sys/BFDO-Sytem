import { z } from "zod";

export const REPORT_TYPES = ["activities", "tasks", "archive", "gallery"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

const emptyToUndefined = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "") ? undefined : v;

const dateFilter = z.preprocess(emptyToUndefined, z.coerce.date().optional());

export const reportFiltersSchema = z.object({
  type: z.enum(REPORT_TYPES),
  from: dateFilter,
  to: dateFilter,
  projectId: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  category: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  status: z.preprocess(emptyToUndefined, z.string().trim().optional()),
});

export type ReportFilters = z.infer<typeof reportFiltersSchema>;
