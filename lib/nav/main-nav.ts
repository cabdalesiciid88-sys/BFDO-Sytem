import type { Role } from "@prisma/client";
import { CAN_MANAGE_USERS, CAN_REVIEW_PUBLIC_MEDIA } from "@/lib/permissions/roles";
import {
  Archive,
  BadgeCheck,
  CalendarClock,
  CheckSquare,
  FolderKanban,
  Gavel,
  LayoutDashboard,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Omit to show to every authenticated role. */
  allowedRoles?: ReadonlySet<Role>;
};

/**
 * Single source of truth for the sidebar. Only routes that actually exist
 * and work belong here — see docs/project-status.md for what's still
 * pending. Add an entry here in the same change that ships the feature,
 * not before (spec rule: no placeholder links/buttons that do nothing).
 */
export const MAIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Activity Register", href: "/activities", icon: CalendarClock },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Meetings", href: "/meetings", icon: Users },
  { label: "Decisions", href: "/decisions", icon: Gavel },
  { label: "Digital Archive", href: "/archive", icon: Archive },
  {
    label: "Gallery Review",
    href: "/archive/review",
    icon: BadgeCheck,
    allowedRoles: CAN_REVIEW_PUBLIC_MEDIA,
  },
  { label: "Team", href: "/team", icon: UserCog, allowedRoles: CAN_MANAGE_USERS },
];

export function visibleNavItems(items: NavItem[], role: Role): NavItem[] {
  return items.filter((item) => !item.allowedRoles || item.allowedRoles.has(role));
}
