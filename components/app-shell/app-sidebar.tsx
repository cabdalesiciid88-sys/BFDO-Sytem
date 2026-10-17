import Link from "next/link";
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { MAIN_NAV, visibleNavItems } from "@/lib/nav/main-nav";
import type { Role } from "@prisma/client";

export function AppSidebar({ role }: { role: Role }) {
  // Icons are rendered here (server side) into plain elements before being
  // handed to SidebarNav ("use client") — a lucide-react component
  // *function* can't cross the Server->Client boundary, only an
  // already-rendered element can. See sidebar-nav.tsx's RenderedNavItem.
  const mainItems = visibleNavItems(MAIN_NAV, role).map((item) => ({
    href: item.href,
    label: item.label,
    icon: <item.icon />,
  }));

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader className="px-3 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            B
          </span>
          <span className="group-data-[collapsible=icon]:hidden">
            BFDO Management System
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarNav items={mainItems} />
      </SidebarContent>
    </Sidebar>
  );
}
