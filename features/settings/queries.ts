import "server-only";
import { prisma } from "@/lib/db/client";

const SETTINGS_ID = "singleton";

/** Creates the default row on first read rather than requiring a seed step —
 *  every other part of the app (public gallery, future settings-dependent
 *  features) can just call this and always get a row back. */
export async function getOrgSettings() {
  return prisma.orgSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
  });
}
