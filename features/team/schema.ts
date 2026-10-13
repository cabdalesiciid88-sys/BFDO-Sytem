import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password";

// A conditionally-rendered field (e.g. no departments exist yet) is simply
// absent from the DOM at submit time, so FormData.get() returns null, not
// "" — both must collapse to undefined for an .optional() field.
const emptyToUndefined = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "") ? undefined : v;

export const ROLE_VALUES = [
  "SYSTEM_ADMIN",
  "LEADERSHIP",
  "PROJECT_MANAGER",
  "COORDINATOR",
  "TEAM_MEMBER",
] as const;

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(100);

export const createUserSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(ROLE_VALUES),
  departmentId: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  password: passwordSchema,
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(200),
  role: z.enum(ROLE_VALUES),
  departmentId: z.preprocess(emptyToUndefined, z.string().trim().optional()),
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
