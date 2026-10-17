import { requireUser } from "@/lib/auth/current-user";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { UserMenu } from "@/components/app-shell/user-menu";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Every route under this layout is protected: requireUser() redirects to
  // /login if there's no valid session, and validateSessionToken() (called
  // internally) already excludes deactivated accounts.
  const user = await requireUser();

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar role={user.role} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-5" />
          </div>
          <UserMenu user={user} />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
