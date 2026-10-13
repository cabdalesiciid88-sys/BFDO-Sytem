import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { listPublicGalleryItems } from "@/features/gallery/queries";
import { resetTestDatabase } from "../helpers/reset-db";
import { createTestUser } from "../helpers/factories";

beforeEach(resetTestDatabase);
afterAll(() => prisma.$disconnect());

async function createMediaWithApproval(
  uploaderId: string,
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED",
) {
  const media = await prisma.mediaAsset.create({
    data: {
      originalFilename: "secret-document.pdf",
      storagePath: `uploads/${crypto.randomUUID()}.bin`,
      mimeType: "image/png",
      fileSizeBytes: 123,
      category: "PHOTO",
      description: "Internal-only description that must never leak publicly",
      uploaderId,
    },
  });
  await prisma.mediaApproval.create({
    data: {
      mediaAssetId: media.id,
      submittedById: uploaderId,
      status,
      publicCaption: "A nice public caption",
      reviewedAt: status === "PENDING" ? null : new Date(),
    },
  });
  return media;
}

/**
 * docs/permissions.md hard rule 5: "Public gallery queries select only
 * media_approvals.status = APPROVED and must never return internal fields
 * (uploader identity, storage path, project/activity linkage, private
 * description) — only the public caption and a served (not raw-path)
 * image URL."
 */
describe("hard rule 5 — public gallery query is leak-proof", () => {
  it("returns only APPROVED items, never PENDING/REJECTED/REVOKED", async () => {
    const uploader = await createTestUser({ role: "PROJECT_MANAGER" });
    const approved = await createMediaWithApproval(uploader.id, "APPROVED");
    await createMediaWithApproval(uploader.id, "PENDING");
    await createMediaWithApproval(uploader.id, "REJECTED");
    await createMediaWithApproval(uploader.id, "REVOKED");

    const items = await listPublicGalleryItems();

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(approved.id);
  });

  it("never returns uploader identity, storage path, or the private description — only caption, category, mimeType, approvedAt", async () => {
    const uploader = await createTestUser({ role: "PROJECT_MANAGER" });
    await createMediaWithApproval(uploader.id, "APPROVED");

    const items = await listPublicGalleryItems();
    expect(items).toHaveLength(1);

    const keys = Object.keys(items[0]).sort();
    expect(keys).toEqual(["approvedAt", "caption", "category", "id", "mimeType"].sort());

    const serialized = JSON.stringify(items[0]);
    expect(serialized).not.toContain("secret-document.pdf");
    expect(serialized).not.toContain("uploads/");
    expect(serialized).not.toContain("Internal-only description");
    expect(serialized).not.toContain(uploader.id);
    expect(serialized).not.toContain(uploader.email);
  });
});
