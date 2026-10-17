"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// icon is a pre-rendered element (built server-side in AppSidebar), not a
// component reference — a component *function* can't cross the Server->
// Client boundary into this "use client" component (Next.js RSC rule), but
// an already-rendered element is a plain serializable object and is fine.
export type RenderedNavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export function SidebarNav({ items }: { items: RenderedNavItem[] }) {
  const pathname = usePathname();

  // Pick the single longest-prefix match (not "every item whose href
  // prefixes pathname") so e.g. /archive/review highlights only "Gallery
  // Review", not both it and the shorter "Digital Archive" (/archive).
  const activeHref = items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Main</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  tooltip={item.label}
                  isActive={isActive}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
