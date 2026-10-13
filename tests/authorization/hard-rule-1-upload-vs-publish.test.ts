import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { ForbiddenError } from "@/lib/permissions/errors";
import {
  requireCanReviewPublicMedia,
  requireCanSubmitForApproval,
} from "@/lib/permissions/media-access";
import { resetTestDatabase } from "../helpers/reset-db";
import { createTestUser } from "../helpers/factories";

beforeEach(resetTestDatabase);
afterAll(() => prisma.$disconnect());

/**
 * docs/permissions.md hard rule 1: "Upload permission never implies publish
 * permission. A Project Manager or Coordinator can upload media but cannot
 * approve their own (or anyone else's) submission for the public gallery."
 */
describe("hard rule 1 — upload permission never implies publish permission", () => {
  it.each(["PROJECT_MANAGER", "COORDINATOR"] as const)(
    "%s can submit their own upload for approval but cannot review/approve it",
    async (role) => {
      const user = await createTestUser({ role });
      const media = { id: "media-1", uploaderId: user.id, projectIds: [] };

      await expect(requireCanSubmitForApproval(user, media)).resolves.toBeUndefined();
      expect(() => requireCanReviewPublicMedia(user)).toThrow(ForbiddenError);
    },
  );

  it("Admin and Leadership can review/approve; everyone else cannot", async () => {
    const admin = await createTestUser({ role: "SYSTEM_ADMIN" });
    const leadership = await createTestUser({ role: "LEADERSHIP" });
    const teamMember = await createTestUser({ role: "TEAM_MEMBER" });

    expect(() => requireCanReviewPublicMedia(admin)).not.toThrow();
    expect(() => requireCanReviewPublicMedia(leadership)).not.toThrow();
    expect(() => requireCanReviewPublicMedia(teamMember)).toThrow(ForbiddenError);
  });

  it("Team Member cannot even submit for approval (no upload permission at all)", async () => {
    const user = await createTestUser({ role: "TEAM_MEMBER" });
    const media = { id: "media-1", uploaderId: user.id, projectIds: [] };

    await expect(requireCanSubmitForApproval(user, media)).rejects.toThrow(ForbiddenError);
  });
});
