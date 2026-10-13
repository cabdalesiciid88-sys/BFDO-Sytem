import "server-only";
import { prisma } from "@/lib/db/client";
import type { Prisma, Role, UserStatus } from "@prisma/client";

export type TeamListFilters = {
  search?: string;
  role?: Role;
  status?: UserStatus;
};

export async function listUsers(filters: TeamListFilters = {}) {
  const and: Prisma.UserWhereInput[] = [];
  if (filters.role) and.push({ role: filters.role });
  if (filters.status) and.push({ status: filters.status });
  if (filters.search) {
    and.push({
      OR: [
        { fullName: { contains: filters.search } },
        { email: { contains: filters.search } },
      ],
    });
  }

  return prisma.user.findMany({
    where: and.length > 0 ? { AND: and } : {},
    include: { department: { select: { id: true, name: true } } },
    orderBy: { fullName: "asc" },
  });
}

export async function getUserDetail(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { department: { select: { id: true, name: true } } },
  });
}

export async function listDepartments() {
  return prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
