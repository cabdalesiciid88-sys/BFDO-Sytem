import "server-only";
import { ForbiddenError } from "@/lib/permissions/errors";
import type { Role } from "@prisma/client";

/**
 * "A user cannot grant themselves a higher role" (docs/permissions.md hard
 * rule 2). The broader rule — no non-admin can change *any* role at all —
 * is enforced by the CAN_MANAGE_USERS gate on the calling action (see
 * tests/permissions/roles.test.ts). This is the narrower, concrete footgun
 * on top of that: an admin accidentally locking the org out by demoting
 * their own account away from SYSTEM_ADMIN.
 */
export function requireNotSelfDemotion(
  actingUserId: string,
  targetUserId: string,
  newRole: Role,
): void {
  if (actingUserId === targetUserId && newRole !== "SYSTEM_ADMIN") {
    throw new ForbiddenError("You cannot change your own role away from System Administrator.");
  }
}
