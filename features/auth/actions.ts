"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySessionByToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isRateLimited, LOGIN_RATE_LIMIT } from "@/lib/auth/rate-limit";
import { recordAuditLog } from "@/lib/audit/log";
import { loginSchema } from "@/features/auth/schema";

export type LoginState = { error: string } | null;

async function clientIpFromHeaders(): Promise<string> {
  const h = await headers();
  // Hostinger/cPanel terminates TLS in front of the Node app and forwards
  // this header; fall back to a constant key if absent (local dev).
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const ip = await clientIpFromHeaders();
  if (isRateLimited(`login:${ip}:${parsed.data.email}`, LOGIN_RATE_LIMIT)) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Same generic message whether the account doesn't exist, the password
  // is wrong, or the account is deactivated/invited-but-not-activated —
  // never reveal which, to avoid account enumeration.
  const genericError = { error: "Invalid email or password." };
  const attemptedEmail = parsed.data.email;

  async function logFailure() {
    await recordAuditLog({
      actorId: null,
      action: "auth.login_failed",
      targetType: "User",
      targetId: user?.id ?? null,
      metadata: { email: attemptedEmail },
      ipAddress: ip,
    });
  }

  if (!user || user.status !== "ACTIVE") {
    await logFailure();
    return genericError;
  }

  const passwordOk = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!passwordOk) {
    await logFailure();
    return genericError;
  }

  const h = await headers();
  const { rawToken, expiresAt } = await createSession(user.id, {
    userAgent: h.get("user-agent"),
    ipAddress: ip,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  await recordAuditLog({
    actorId: user.id,
    action: "auth.login",
    targetType: "User",
    targetId: user.id,
    ipAddress: ip,
  });

  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (rawToken) {
    const user = await getCurrentUser();
    await destroySessionByToken(rawToken);
    cookieStore.delete(SESSION_COOKIE_NAME);
    if (user) {
      await recordAuditLog({
        actorId: user.id,
        action: "auth.logout",
        targetType: "User",
        targetId: user.id,
      });
    }
  }
  redirect("/login");
}

/** Used by the login page to skip straight to the dashboard if already signed in. */
export async function redirectIfAuthenticated(): Promise<void> {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
}
