/**
 * One-time bootstrap: creates the first System Administrator account.
 * Run with: npm run create-admin
 *
 * Reads BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD from .env. This
 * script is the only account-creation path that doesn't require an
 * existing admin to already exist — every account after this one is
 * created through the admin-only User Management UI (Phase 3).
 */
import "dotenv/config";
import { prisma } from "../lib/db/client";
import { hashPassword, PASSWORD_MIN_LENGTH } from "../lib/auth/password";

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      "Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD in .env before running this script.",
    );
    process.exitCode = 1;
    return;
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    console.error(`BOOTSTRAP_ADMIN_PASSWORD must be at least ${PASSWORD_MIN_LENGTH} characters.`);
    process.exitCode = 1;
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`A user with email ${email} already exists (role: ${existing.role}, status: ${existing.status}). Nothing to do.`);
    return;
  }

  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: "System Administrator",
      role: "SYSTEM_ADMIN",
      status: "ACTIVE",
    },
  });

  console.log(`Created System Administrator ${admin.email} (id: ${admin.id}).`);
  console.log("Sign in, then update the display name and consider rotating the password from the account settings once that page ships.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
