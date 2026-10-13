import { prisma } from "@/lib/db/client";

/**
 * Wipes every table in the dedicated test database (bfdo_management_test,
 * per .env.test — never the dev database). Deletion order respects foreign
 * keys (children before parents) so this runs against MySQL's default
 * FK-enforcing InnoDB without needing to disable constraint checks.
 *
 * Call from `beforeEach` in any integration test that touches the
 * database, so each test starts from a known-empty state rather than
 * depending on leftover rows from a previous test or run.
 */
export async function resetTestDatabase(): Promise<void> {
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.mediaApproval.deleteMany();
  await prisma.activityMedia.deleteMany();
  await prisma.projectMedia.deleteMany();
  await prisma.meetingAttachment.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.meetingParticipant.deleteMany();
  await prisma.task.deleteMany();
  await prisma.activityParticipant.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.report.deleteMany();
  await prisma.project.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.orgSettings.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
}
