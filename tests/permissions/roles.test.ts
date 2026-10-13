import { describe, expect, it } from "vitest";
import {
  CAN_CREATE_ACTIVITY,
  CAN_CREATE_PROJECT,
  CAN_CREATE_TASK,
  CAN_MANAGE_SETTINGS,
  CAN_MANAGE_USERS,
  CAN_RECORD_MEETINGS,
  CAN_REVIEW_PUBLIC_MEDIA,
  CAN_UPLOAD_MEDIA,
  CAN_VIEW_AUDIT_LOGS,
  CAN_VIEW_ORG_WIDE,
  CAN_VIEW_REPORTS,
  ROLES,
} from "@/lib/permissions/roles";
import type { Role } from "@prisma/client";

const ALL_ROLES: Role[] = Object.values(ROLES);

/**
 * Encodes docs/permissions.md's permission matrix as an executable check.
 * Exact-set assertions (not just "includes") on purpose — an accidental
 * extra role in a capability set is an over-grant (a real security bug),
 * not just a missing-feature bug, so both directions must be caught.
 */
function expectExactRoles(actual: ReadonlySet<Role>, expected: Role[]) {
  expect([...actual].sort()).toEqual([...expected].sort());
  for (const role of ALL_ROLES) {
    expect(actual.has(role)).toBe(expected.includes(role));
  }
}

describe("docs/permissions.md matrix, as enforced by lib/permissions/roles.ts", () => {
  it("Create project: Admin, Project Manager", () => {
    expectExactRoles(CAN_CREATE_PROJECT, ["SYSTEM_ADMIN", "PROJECT_MANAGER"]);
  });

  it("Create activity: Admin, Project Manager, Coordinator", () => {
    expectExactRoles(CAN_CREATE_ACTIVITY, ["SYSTEM_ADMIN", "PROJECT_MANAGER", "COORDINATOR"]);
  });

  it("Upload media (archive): Admin, Project Manager, Coordinator — never Leadership/Team Member", () => {
    expectExactRoles(CAN_UPLOAD_MEDIA, ["SYSTEM_ADMIN", "PROJECT_MANAGER", "COORDINATOR"]);
  });

  it("Approve/reject/revoke public media: Admin, Leadership only (hard rule 1 — upload != publish)", () => {
    expectExactRoles(CAN_REVIEW_PUBLIC_MEDIA, ["SYSTEM_ADMIN", "LEADERSHIP"]);
    // The set that can upload and the set that can publish must be disjoint
    // for the non-admin roles, or hard rule 1 ("upload permission never
    // implies publish permission") has no teeth.
    for (const role of ["PROJECT_MANAGER", "COORDINATOR"] as const) {
      expect(CAN_UPLOAD_MEDIA.has(role)).toBe(true);
      expect(CAN_REVIEW_PUBLIC_MEDIA.has(role)).toBe(false);
    }
  });

  it("Create/assign tasks: Admin, Project Manager, Coordinator", () => {
    expectExactRoles(CAN_CREATE_TASK, ["SYSTEM_ADMIN", "PROJECT_MANAGER", "COORDINATOR"]);
  });

  it("Record meetings/decisions: Admin, Project Manager, Coordinator", () => {
    expectExactRoles(CAN_RECORD_MEETINGS, ["SYSTEM_ADMIN", "PROJECT_MANAGER", "COORDINATOR"]);
  });

  it("View reports / Export CSV: everyone except Team Member", () => {
    expectExactRoles(CAN_VIEW_REPORTS, [
      "SYSTEM_ADMIN",
      "LEADERSHIP",
      "PROJECT_MANAGER",
      "COORDINATOR",
    ]);
  });

  it("Manage users/roles: Admin only", () => {
    expectExactRoles(CAN_MANAGE_USERS, ["SYSTEM_ADMIN"]);
  });

  it("View audit logs: Admin only", () => {
    expectExactRoles(CAN_VIEW_AUDIT_LOGS, ["SYSTEM_ADMIN"]);
  });

  it("Manage system settings: Admin only", () => {
    expectExactRoles(CAN_MANAGE_SETTINGS, ["SYSTEM_ADMIN"]);
  });

  it("Org-wide view access: Admin, Leadership only", () => {
    expectExactRoles(CAN_VIEW_ORG_WIDE, ["SYSTEM_ADMIN", "LEADERSHIP"]);
  });

  it("every ROLES entry round-trips through the Role enum", () => {
    expect(ALL_ROLES.sort()).toEqual(
      ["SYSTEM_ADMIN", "LEADERSHIP", "PROJECT_MANAGER", "COORDINATOR", "TEAM_MEMBER"].sort(),
    );
  });
});
