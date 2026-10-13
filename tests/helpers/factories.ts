import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import type { Role, UserStatus } from "@prisma/client";

let counter = 0;
/** Unique-per-call suffix so parallel-looking test data never collides,
 *  even though the suite itself runs test files sequentially. */
function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now()}-${counter}`;
}

export async function createTestUser(overrides: {
  role?: Role;
  status?: UserStatus;
  password?: string;
  email?: string;
} = {}) {
  const password = overrides.password ?? "TestPassword123!";
  return prisma.user.create({
    data: {
      email: overrides.email ?? `test-${uniqueSuffix()}@example.test`,
      fullName: "Test User",
      passwordHash: await hashPassword(password),
      role: overrides.role ?? "TEAM_MEMBER",
      status: overrides.status ?? "ACTIVE",
    },
  });
}

export async function createTestProject(managerId: string) {
  return prisma.project.create({
    data: {
      referenceCode: `TEST-${uniqueSuffix()}`,
      title: "Test Project",
      managerId,
      members: {
        create: { userId: managerId, roleInProject: "MANAGER" },
      },
    },
  });
}
