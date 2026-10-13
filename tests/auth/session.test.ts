import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import {
  createSession,
  destroyAllSessionsForUser,
  destroySessionByToken,
  validateSessionToken,
} from "@/lib/auth/session";
import { resetTestDatabase } from "../helpers/reset-db";
import { createTestUser } from "../helpers/factories";

beforeEach(resetTestDatabase);
afterAll(() => prisma.$disconnect());

describe("lib/auth/session — database-backed sessions (not JWT)", () => {
  it("creates a session row and returns a usable raw token", async () => {
    const user = await createTestUser();
    const { rawToken, expiresAt } = await createSession(user.id);

    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    const session = await prisma.session.findFirst({ where: { userId: user.id } });
    expect(session).not.toBeNull();
    // The raw token must never be stored verbatim — only its hash.
    expect(session?.tokenHash).not.toBe(rawToken);
  });

  it("validates a live session and returns the associated user", async () => {
    const user = await createTestUser({ role: "COORDINATOR" });
    const { rawToken } = await createSession(user.id);

    const sessionUser = await validateSessionToken(rawToken);
    expect(sessionUser?.id).toBe(user.id);
    expect(sessionUser?.role).toBe("COORDINATOR");
  });

  it("rejects a token that was never issued", async () => {
    expect(await validateSessionToken("not-a-real-token")).toBeNull();
  });

  it("rejects and deletes an expired session", async () => {
    const user = await createTestUser();
    const { rawToken } = await createSession(user.id);

    await prisma.session.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect(await validateSessionToken(rawToken)).toBeNull();
    const remaining = await prisma.session.findFirst({ where: { userId: user.id } });
    expect(remaining).toBeNull();
  });

  it("rejects a session for a deactivated user even though the session row itself hasn't expired (defense in depth)", async () => {
    const user = await createTestUser({ status: "ACTIVE" });
    const { rawToken } = await createSession(user.id);

    await prisma.user.update({ where: { id: user.id }, data: { status: "DEACTIVATED" } });

    expect(await validateSessionToken(rawToken)).toBeNull();
  });

  it("destroySessionByToken removes only that session", async () => {
    const user = await createTestUser();
    const a = await createSession(user.id);
    const b = await createSession(user.id);

    await destroySessionByToken(a.rawToken);

    expect(await validateSessionToken(a.rawToken)).toBeNull();
    expect(await validateSessionToken(b.rawToken)).not.toBeNull();
  });

  it("destroyAllSessionsForUser revokes every session for that user, immediately", async () => {
    const user = await createTestUser();
    const a = await createSession(user.id);
    const b = await createSession(user.id, { userAgent: "second device" });

    await destroyAllSessionsForUser(user.id);

    expect(await validateSessionToken(a.rawToken)).toBeNull();
    expect(await validateSessionToken(b.rawToken)).toBeNull();
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
  });
});
