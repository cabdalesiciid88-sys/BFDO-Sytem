import type { Role } from "@prisma/client";

/**
 * Canonical role list + helpers. This file has no DB access — it is pure
 * logic so it can be unit tested without a database (see tests/permissions).
 */

export const ROLES = {
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  LEADERSHIP: "LEADERSHIP",
  PROJECT_MANAGER: "PROJECT_MANAGER",
  COORDINATOR: "COORDINATOR",
  TEAM_MEMBER: "TEAM_MEMBER",
} as const satisfies Record<Role, Role>;

export type AuthenticatedRole = Role;

/** Roles allowed to upload media into the Digital Archive (spec 5, 10). */
export const CAN_UPLOAD_MEDIA: ReadonlySet<Role> = new Set([
  "SYSTEM_ADMIN",
  "PROJECT_MANAGER",
  "COORDINATOR",
]);

/**
 * Roles allowed to approve/reject/revoke public gallery submissions.
 * Deliberately excludes PROJECT_MANAGER and COORDINATOR — upload permission
 * must never imply publish permission (spec 5, hard rule).
 */
export const CAN_REVIEW_PUBLIC_MEDIA: ReadonlySet<Role> = new Set([
  "SYSTEM_ADMIN",
  "LEADERSHIP",
]);

export const CAN_MANAGE_USERS: ReadonlySet<Role> = new Set(["SYSTEM_ADMIN"]);

export const CAN_VIEW_AUDIT_LOGS: ReadonlySet<Role> = new Set(["SYSTEM_ADMIN"]);

export const CAN_CREATE_PROJECT: ReadonlySet<Role> = new Set([
  "SYSTEM_ADMIN",
  "PROJECT_MANAGER",
]);

/** Global roles allowed to create an activity (further narrowed per-project
 *  by lib/permissions/activity-access.ts — membership on the target project
 *  is also required for everyone except SYSTEM_ADMIN). */
export const CAN_CREATE_ACTIVITY: ReadonlySet<Role> = new Set([
  "SYSTEM_ADMIN",
  "PROJECT_MANAGER",
  "COORDINATOR",
]);

/** Global roles allowed to create/assign a task, further narrowed per-project
 *  by lib/permissions/task-access.ts. */
export const CAN_CREATE_TASK: ReadonlySet<Role> = new Set([
  "SYSTEM_ADMIN",
  "PROJECT_MANAGER",
  "COORDINATOR",
]);

/** "Record meetings/decisions" in docs/permissions.md — covers both Meeting and Decision rows. */
export const CAN_RECORD_MEETINGS: ReadonlySet<Role> = new Set([
  "SYSTEM_ADMIN",
  "PROJECT_MANAGER",
  "COORDINATOR",
]);

export const CAN_VIEW_ORG_WIDE: ReadonlySet<Role> = new Set([
  "SYSTEM_ADMIN",
  "LEADERSHIP",
]);
