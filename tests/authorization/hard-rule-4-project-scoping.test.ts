import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { ForbiddenError } from "@/lib/permissions/errors";
import { requireProjectAccess } from "@/lib/permissions/project-access";
import { requireActivityAccess } from "@/lib/permissions/activity-access";
import { resetTestDatabase } from "../helpers/reset-db";
import { createTestProject, createTestUser } from "../helpers/factories";

beforeEach(resetTestDatabase);
afterAll(() => prisma.$disconnect());

/**
 * docs/permissions.md hard rule 4: "Every project-scoped list/detail query
 * must filter by project membership (or manager) at the data layer... Direct
 * navigation to /projects/[id] or /activities/[id] for a project the user
 * isn't on must return 403/404."
 */
describe("hard rule 4 — project-scoped access is enforced by membership, not just hidden UI", () => {
  it("a Project Manager can access their own project but not someone else's", async () => {
    const managerA = await createTestUser({ role: "PROJECT_MANAGER" });
    const managerB = await createTestUser({ role: "PROJECT_MANAGER" });
    const projectA = await createTestProject(managerA.id);
    const projectB = await createTestProject(managerB.id);

    await expect(requireProjectAccess(managerA, projectA.id)).resolves.not.toBeNull();
    await expect(requireProjectAccess(managerA, projectB.id)).rejects.toThrow(ForbiddenError);
  });

  it("a Coordinator with no membership on a project is blocked, even if assigned elsewhere", async () => {
    const manager = await createTestUser({ role: "PROJECT_MANAGER" });
    const coordinator = await createTestUser({ role: "COORDINATOR" });
    const theirProject = await createTestProject(manager.id);
    const otherProject = await createTestProject(manager.id);

    await prisma.projectMember.create({
      data: { projectId: theirProject.id, userId: coordinator.id, roleInProject: "COORDINATOR" },
    });

    await expect(requireProjectAccess(coordinator, theirProject.id)).resolves.not.toBeNull();
    await expect(requireProjectAccess(coordinator, otherProject.id)).rejects.toThrow(ForbiddenError);
  });

  it("Admin and Leadership bypass membership checks (org-wide view access)", async () => {
    const manager = await createTestUser({ role: "PROJECT_MANAGER" });
    const project = await createTestProject(manager.id);
    const admin = await createTestUser({ role: "SYSTEM_ADMIN" });
    const leadership = await createTestUser({ role: "LEADERSHIP" });

    expect(await requireProjectAccess(admin, project.id)).toBe("ORG_WIDE");
    expect(await requireProjectAccess(leadership, project.id)).toBe("ORG_WIDE");
  });

  it("direct navigation to an activity in a project the user isn't on is blocked (not just hidden)", async () => {
    const manager = await createTestUser({ role: "PROJECT_MANAGER" });
    const outsider = await createTestUser({ role: "TEAM_MEMBER" });
    const project = await createTestProject(manager.id);

    const activity = await prisma.activity.create({
      data: {
        referenceCode: "TEST-ACT-1",
        title: "Private activity",
        projectId: project.id,
        activityDate: new Date(),
        responsibleId: manager.id,
        createdById: manager.id,
      },
    });

    // Neither a participant, responsible, creator, nor project member.
    await expect(
      requireActivityAccess(outsider, {
        id: activity.id,
        projectId: activity.projectId,
        createdById: activity.createdById,
        responsibleId: activity.responsibleId,
      }),
    ).rejects.toThrow(ForbiddenError);

    // The project manager themself can, via membership.
    await expect(
      requireActivityAccess(manager, {
        id: activity.id,
        projectId: activity.projectId,
        createdById: activity.createdById,
        responsibleId: activity.responsibleId,
      }),
    ).resolves.toBeUndefined();
  });
});
