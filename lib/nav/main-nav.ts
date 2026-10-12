import type { Role } from "@prisma/client";
import { LayoutDashboard, type LucideIcon } from "lucide-react";

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
];

export function visibleNavItems(items: NavItem[], role: Role): NavItem[] {
  return items.filter((item) => !item.allowedRoles || item.allowedRoles.has(role));
}
