import { describe, expect, it } from "vitest";
import { ForbiddenError } from "@/lib/permissions/errors";
import { requireNotSelfDemotion } from "@/lib/permissions/user-access";
import { CAN_MANAGE_USERS } from "@/lib/permissions/roles";

// Pure logic, no database needed — same rationale as tests/permissions.

/**
 * docs/permissions.md hard rule 2: "A user cannot grant themselves a higher
 * role. Role changes are only writable through the admin-only
 * user-management action, which itself re-checks the acting user's role
 * server-side on every call."
 */
describe("hard rule 2 — a user cannot grant themselves a higher role", () => {
  it("only SYSTEM_ADMIN can call the role-management capability at all — no other role is in CAN_MANAGE_USERS", () => {
    // If this were ever broadened, a non-admin invoking the role-change
    // action for their OWN account would be able to self-promote — so the
    // single-admin-role invariant is itself part of this hard rule.
    expect([...CAN_MANAGE_USERS]).toEqual(["SYSTEM_ADMIN"]);
  });

  it("an admin cannot demote their own account away from SYSTEM_ADMIN", () => {
    const adminId = "admin-1";
    expect(() => requireNotSelfDemotion(adminId, adminId, "LEADERSHIP")).toThrow(ForbiddenError);
    expect(() => requireNotSelfDemotion(adminId, adminId, "TEAM_MEMBER")).toThrow(ForbiddenError);
  });

  it("an admin re-saving their own account as SYSTEM_ADMIN is a no-op, not blocked", () => {
    const adminId = "admin-1";
    expect(() => requireNotSelfDemotion(adminId, adminId, "SYSTEM_ADMIN")).not.toThrow();
  });

  it("an admin changing a DIFFERENT user's role is unaffected by the self-demotion guard", () => {
    expect(() => requireNotSelfDemotion("admin-1", "someone-else", "TEAM_MEMBER")).not.toThrow();
  });
});
