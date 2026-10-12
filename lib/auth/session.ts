import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db/client";
import type { User } from "@prisma/client";

// Database session strategy (not JWT) specifically so that deactivating a
// user — or logging out one device — takes effect on that session's very
// next request, not "whenever the token happens to expire". See
// docs/architecture.md "Why not Auth.js".

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_COOKIE_NAME = "bfdo_session";

function generateRawToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export type SessionUser = Pick<
  User,
  "id" | "email" | "fullName" | "role" | "status" | "avatarPath"
>;

/**
 * Creates a new session row and returns the raw token to set as a cookie.
 * The raw token is never stored — only its hash — so a leaked database
 * backup cannot be replayed as a live session.
 */
export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ipAddress?: string | null } = {},
): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = generateRawToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      tokenHash: hashToken(rawToken),
      userId,
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
      expiresAt,
    },
  });

  return { rawToken, expiresAt };
}

/**
 * Validates a raw session token from the cookie. Returns the associated
 * user if the session exists, hasn't expired, and the user is still
 * ACTIVE — otherwise null. Expired sessions are opportunistically deleted.
 */
export async function validateSessionToken(
  rawToken: string,
): Promise<SessionUser | null> {
  const tokenHash = hashToken(rawToken);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
          avatarPath: true,
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {
      // Already removed by a concurrent request — fine to ignore.
    });
    return null;
  }

  // Deactivated accounts lose access immediately, even if a stale session
  // row somehow still exists (deactivation also deletes sessions — this is
  // a second, defense-in-depth check).
  if (session.user.status !== "ACTIVE") return null;

  return session.user;
}

export async function destroySessionByToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.session.deleteMany({ where: { tokenHash } });
}

/** Used by account deactivation — revokes every active session for a user. */
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
