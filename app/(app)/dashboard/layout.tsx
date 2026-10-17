import { requireUser } from "@/lib/auth/current-user";
import { getTeamPreview } from "@/features/dashboard/queries";
import { listActivities } from "@/features/activities/queries";
import { DashboardRightPanel } from "@/components/app-shell/dashboard-right-panel";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [team, activities] = await Promise.all([
    getTeamPreview(),
    listActivities(user, { take: 5 }),
  ]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">{children}</div>
      <DashboardRightPanel team={team} activities={activities} />
    </div>
  );
}
