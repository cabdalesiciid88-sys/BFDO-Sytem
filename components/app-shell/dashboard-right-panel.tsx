import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: "System Administrator",
  LEADERSHIP: "Organization Leadership",
  PROJECT_MANAGER: "Project Manager",
  COORDINATOR: "Coordinator",
  TEAM_MEMBER: "Team Member",
};

function initials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export type TeamPreviewMember = {
  id: string;
  fullName: string;
  role: string;
};

export type RecentActivityItem = {
  id: string;
  title: string;
  activityDate: Date;
  responsible: { fullName: string } | null;
};

export function DashboardRightPanel({
  team,
  activities,
}: {
  team: TeamPreviewMember[];
  activities: RecentActivityItem[];
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
        </CardHeader>
        <CardContent>
          {team.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teammates yet.</p>
          ) : (
            <ul className="space-y-3">
              {team.map((member) => (
                <li key={member.id} className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback>{initials(member.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{member.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ROLE_LABELS[member.role] ?? member.role}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {activities.map((activity) => (
                <li key={activity.id} className="text-sm">
                  <Link href={`/activities/${activity.id}`} className="font-medium hover:underline">
                    {activity.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(activity.activityDate, { addSuffix: true })}
                    {activity.responsible ? ` · ${activity.responsible.fullName}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
