import { requireUser } from "@/lib/auth/current-user";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Dashboard — BFDO Management System",
};

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.fullName}</h1>
        <p className="text-sm text-muted-foreground">
          You&apos;re signed in as {user.role.replaceAll("_", " ").toLowerCase()}.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dashboard metrics are coming in the next build phase</CardTitle>
          <CardDescription>
            Project, activity, task, and archive summaries will appear here once those
            modules are built — see docs/project-status.md for progress.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
