import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, validateSessionToken, type SessionUser } from "@/lib/auth/session";

/**
 * Returns the current user from their session cookie, or null if there is
 * no session, it's expired, or the account has been deactivated. Safe to
 * call from any Server Component, Server Action, or Route Handler.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;

  return validateSessionToken(rawToken);
}

/**
 * Use at the top of any protected Server Component/layout. Redirects to
 * /login (preserving the originally requested path) rather than rendering
 * anything for an unauthenticated or deactivated user.
 */
export async function requireUser(redirectTo = "/login"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);
  return user;
}
