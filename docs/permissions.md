# Permissions & Roles

This is the source of truth for who can do what. Every row here must be
enforced in `lib/permissions/` and checked inside the server action or route
handler that performs the operation — there is no database-level backstop
(MySQL has no Row-Level Security), so a missing check here is a real
vulnerability, not just a UI bug. See `docs/security.md` for how this
tradeoff is covered.

## Roles

| Role | Scope |
|---|---|
| `SYSTEM_ADMIN` | Full system access, including user/role management and audit logs. |
| `LEADERSHIP` | Organization-wide read access to authorized projects/activities/reports. No create/edit on operational records by default. |
| `PROJECT_MANAGER` | Full control of projects they manage; create/edit within those projects. |
| `COORDINATOR` | Operate within projects they're assigned to as a coordinator. |
| `TEAM_MEMBER` | View what they're assigned to; no authoring rights. |
| *(unauthenticated)* `PUBLIC_VISITOR` | Public gallery and public pages only. Never reaches `/app/*`. |

"Assigned to a project" means a row exists in `project_members` for that
user and project (or the user is the project's `manager`). Project-scoped
roles (`PROJECT_MANAGER`, `COORDINATOR`, `TEAM_MEMBER`) can only act on
records belonging to projects they're assigned to — guessing another
project's ID in a URL must resolve to a 404/403, never the data.

## Permission matrix

Legend: ✅ full, 🟡 own/assigned-project only, ❌ none.

| Capability | Admin | Leadership | Project Manager | Coordinator | Team Member |
|---|---|---|---|---|---|
| View dashboard metrics | ✅ (org-wide) | ✅ (org-wide) | 🟡 (assigned projects) | 🟡 (assigned projects) | 🟡 (assigned projects) |
| Create project | ✅ | ❌ | ✅ (becomes manager) | ❌ | ❌ |
| Edit project | ✅ | ❌ | 🟡 (own projects) | ❌ | ❌ |
| Archive project | ✅ | ❌ | 🟡 (own projects) | ❌ | ❌ |
| Assign project members | ✅ | ❌ | 🟡 (own projects) | ❌ | ❌ |
| View project | ✅ | ✅ | 🟡 (assigned) | 🟡 (assigned) | 🟡 (assigned) |
| Create activity | ✅ | ❌ | 🟡 (own projects) | 🟡 (assigned projects) | ❌ |
| Edit activity | ✅ | ❌ | 🟡 (own projects) | 🟡 (own entries / assigned project) | ❌ |
| View activity | ✅ | ✅ | 🟡 | 🟡 | 🟡 |
| Upload media (archive) | ✅ | ❌ | ✅ (own projects) | ✅ (assigned projects) | ❌ |
| Edit media metadata | ✅ | ❌ | 🟡 (own uploads/projects) | 🟡 (own uploads) | ❌ |
| Submit media for public approval | ✅ | ❌ | ✅ | ✅ | ❌ |
| Approve/reject/revoke public media | ✅ | ✅ | ❌ | ❌ | ❌ |
| Download private media | ✅ | ✅ | 🟡 (assigned) | 🟡 (assigned) | 🟡 (assigned, if granted) |
| Create/assign tasks | ✅ | ❌ | 🟡 (own projects) | 🟡 (assigned projects) | ❌ |
| Complete own assigned task | ✅ | ✅ | ✅ | ✅ | ✅ |
| Record meetings/decisions | ✅ | ❌ | 🟡 (own projects) | 🟡 (assigned projects) | ❌ |
| View reports | ✅ | ✅ | 🟡 (own projects) | 🟡 (assigned projects) | ❌ |
| Export CSV/PDF | ✅ | ✅ | 🟡 (own projects) | 🟡 (assigned projects) | ❌ |
| Manage users/roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| Deactivate/reactivate account | ✅ | ❌ | ❌ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage system settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| View public gallery | ✅ | ✅ | ✅ | ✅ | ✅ | (everyone, incl. anonymous) |

## Hard rules (tested explicitly — see `tests/authorization`)

1. Upload permission never implies publish permission. A Project Manager or
   Coordinator can upload media but cannot approve their own (or anyone
   else's) submission for the public gallery.
2. A user cannot grant themselves a higher role. Role changes are only
   writable through the admin-only user-management action, which itself
   re-checks the acting user's role server-side on every call.
3. Deactivating a user sets `status = DEACTIVATED` **and** deletes all of
   that user's `Session` rows in the same transaction, so access ends
   immediately rather than at next token expiry. Their historical
   `createdActivities`, `uploadedMedia`, `auditLogs`, etc. are never deleted.
4. Every project-scoped list/detail query must filter by project membership
   (or manager) at the data layer — never rely on the UI simply not showing
   a link. Direct navigation to `/projects/[id]` or `/activities/[id]` for a
   project the user isn't on must return 403/404.
5. Public gallery queries select only `media_approvals.status = APPROVED`
   and must never return internal fields (uploader identity, storage path,
   project/activity linkage, private description) — only the public caption
   and a served (not raw-path) image URL.
6. Audit log rows are append-only. No server action may update or delete an
   `audit_logs` row; this is enforced by never writing such a code path at
   all (there is no UPDATE/DELETE Prisma call against this model anywhere in
   the codebase, and `tests/authorization` includes a regression test
   asserting that).

## Status

This matrix is implemented incrementally — see `docs/project-status.md` for
what's enforced in code today versus still pending.

"Export CSV/PDF" is implemented as CSV only as of Phase 5 (`/api/reports/export`)
— PDF generation was not part of the Phase 5 scope and isn't built yet.
