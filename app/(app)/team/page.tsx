import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { listUsers } from "@/features/team/queries";
import { CAN_MANAGE_USERS } from "@/lib/permissions/roles";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Role, UserStatus } from "@prisma/client";

export const metadata = { title: "Team — BFDO Management System" };

const nativeSelectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: "System Administrator",
  LEADERSHIP: "Leadership",
  PROJECT_MANAGER: "Project Manager",
  COORDINATOR: "Coordinator",
  TEAM_MEMBER: "Team Member",
};

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; role?: string; status?: string }>;
}) {
  const user = await requireUser();
  if (!CAN_MANAGE_USERS.has(user.role)) notFound();

  const params = await searchParams;
  const users = await listUsers({
    search: params.search,
    role: params.role as Role | undefined,
    status: params.status as UserStatus | undefined,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Team"
        description={`${users.length} user${users.length === 1 ? "" : "s"}`}
        actions={
          <Button nativeButton={false} render={<Link href="/team/new" />}>Add team member</Button>
        }
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-48">
          <Input name="search" placeholder="Search name or email…" defaultValue={params.search ?? ""} />
        </div>
        <select name="role" defaultValue={params.role ?? ""} className={nativeSelectClassName + " w-48"}>
          <option value="">All roles</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={params.status ?? ""} className={nativeSelectClassName + " w-36"}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INVITED">Invited</option>
          <option value="DEACTIVATED">Deactivated</option>
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No users match these filters.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Link href={`/team/${u.id}`} className="font-medium hover:underline">
                      {u.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{ROLE_LABELS[u.role]}</TableCell>
                  <TableCell>{u.department?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.status === "DEACTIVATED" ? "destructive" : "default"}>
                      {u.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
