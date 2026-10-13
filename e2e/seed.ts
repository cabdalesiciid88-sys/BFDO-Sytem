/**
 * Playwright globalSetup: seeds the dedicated test database (see
 * .env.test — the same database tests/ integration tests use, never the
 * dev database used for manual browser verification) with two known
 * accounts the E2E specs sign in as. Idempotent (upsert) so re-running
 * locally doesn't fail on a second run.
 */
import "./env";
import { prisma } from "../lib/db/client";
import { hashPassword } from "../lib/auth/password";

export const E2E_ADMIN = { email: "e2e-admin@bfdo.test", password: "E2eAdminPassword123!" };
export const E2E_TEAM_MEMBER = {
  email: "e2e-team-member@bfdo.test",
  password: "E2eMemberPassword123!",
};

async function upsertUser(email: string, password: string, role: "SYSTEM_ADMIN" | "TEAM_MEMBER") {
  const passwordHash = await hashPassword(password);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role, status: "ACTIVE" },
    create: { email, passwordHash, fullName: `E2E ${role}`, role, status: "ACTIVE" },
  });
}

export default async function globalSetup() {
  await upsertUser(E2E_ADMIN.email, E2E_ADMIN.password, "SYSTEM_ADMIN");
  await upsertUser(E2E_TEAM_MEMBER.email, E2E_TEAM_MEMBER.password, "TEAM_MEMBER");
  await prisma.$disconnect();
}
