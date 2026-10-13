import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { createSession, validateSessionToken } from "@/lib/auth/session";
import { deactivateUser, reactivateUser } from "@/lib/users/lifecycle";
import { resetTestDatabase } from "../helpers/reset-db";
import { createTestUser } from "../helpers/factories";

beforeEach(resetTestDatabase);
afterAll(() => prisma.$disconnect());

/**
 * docs/permissions.md hard rule 3: "Deactivating a user sets
 * status = DEACTIVATED and deletes all of that user's Session rows in the
 * same transaction, so access ends immediately rather than at next token
 * expiry."
 */
describe("hard rule 3 — deactivation revokes all sessions atomically", () => {
  it("deactivation flips status AND deletes every live session for that user", async () => {
    const user = await createTestUser({ status: "ACTIVE" });
    const sessionA = await createSession(user.id);
    const sessionB = await createSession(user.id, { userAgent: "second device" });

    await deactivateUser(user.id);

    const reloaded = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(reloaded.status).toBe("DEACTIVATED");
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);

    // Not just gone from the DB — actually unusable for auth, immediately.
    expect(await validateSessionToken(sessionA.rawToken)).toBeNull();
    expect(await validateSessionToken(sessionB.rawToken)).toBeNull();
  });

  it("reactivation restores ACTIVE status but does not resurrect old sessions", async () => {
    const user = await createTestUser({ status: "ACTIVE" });
    const session = await createSession(user.id);
    await deactivateUser(user.id);

    await reactivateUser(user.id);

    const reloaded = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(reloaded.status).toBe("ACTIVE");
    // The user must log in again — a reactivated account does not silently
    // revive a session token that was already invalidated.
    expect(await validateSessionToken(session.rawToken)).toBeNull();
  });

  it("deactivating a user with no live sessions is a harmless no-op on the session table", async () => {
    const user = await createTestUser({ status: "ACTIVE" });
    await expect(deactivateUser(user.id)).resolves.toBeUndefined();
    const reloaded = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(reloaded.status).toBe("DEACTIVATED");
  });
});
