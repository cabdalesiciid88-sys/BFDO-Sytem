# User Guide

A practical guide for BFDO staff using the Management System day to day.
For "who can do what and why," see `docs/permissions.md` — this guide
covers the same ground in plain language, organized by what you're trying
to do rather than by rule.

## Signing in

There's no public sign-up — an administrator creates your account and
gives you your initial email/password directly (in person, or however your
org shares sensitive info — the system itself doesn't email it to you yet).
Go to the site, sign in with those credentials. If you ever forget your
password, ask an administrator to reset it for you from the Team page;
there's no self-service "forgot password" flow yet.

You'll only ever see the modules in the sidebar that your role has access
to — if something described below is missing from your sidebar, that's
expected, not a bug; ask your administrator if you believe you should have
access.

## Roles, in plain terms

- **System Administrator** — full access to everything, including user
  management, audit logs, and system settings.
- **Leadership** — can see everything across the whole organization (every
  project, every report) but doesn't create or edit day-to-day records
  themselves, and is one of the two roles (with Admin) who can approve
  items for the public gallery.
- **Project Manager** — full control of the projects they manage: can
  create activities, tasks, meetings, and upload files within those
  projects, and manage who's on the project team.
- **Coordinator** — works within projects they're assigned to, similar
  day-to-day abilities to a Project Manager but scoped to what they've
  been added to, and can't manage project membership itself.
- **Team Member** — sees what they're personally assigned to (their tasks,
  the projects/activities they're part of) but doesn't create new records.

## Dashboard

Your landing page after signing in. Shows project and task status at a
glance, your own open tasks, and upcoming meetings. Admins and Leadership
see organization-wide numbers; everyone else sees numbers scoped to the
projects they're actually on.

## Projects

The top-level unit of work — most other records (activities, tasks,
meetings) are optionally linked to a project. A project has a manager, a
status (Planned → Active → On Hold / Completed → Archived), and a member
list. Creating a project makes you its manager automatically. Archiving a
project doesn't delete it or anything linked to it — it just marks it
inactive and removes it from "active project" pickers elsewhere.

## Activity Register

The organization's log of work actually carried out — one activity per
event/engagement, with a date, category, location, who was responsible,
and what the outcome was. Activities can be tied to a project or recorded
as organization-wide (the latter is admin-only). Use "Import" context
(the `importedFromSource`/entered-later distinction) when you're entering
something that happened in the past rather than logging it the day it
occurred — this keeps the real event date separate from when it was typed
in.

## Tasks

Assignable units of work, optionally tied to a project and/or a specific
activity. Priority (Low/Medium/High/Urgent) and an optional due date.
Anyone can update the status of a task *assigned to them* without needing
full task-management rights — look for the lighter "update status" control
on a task you're assigned versus the full edit form you'd see as the task's
manager/creator.

## Meetings & Decisions

Record a meeting (agenda, notes, participants, optional project link), and
log any decisions made — either standalone or created directly from inside
a meeting, in which case the decision inherits that meeting's project
automatically. Each decision has a responsible owner and a follow-up
status so it doesn't get lost after the meeting ends.

## Digital Archive

Upload photos and documents (JPEG/PNG photos, PDF/Word/Excel documents —
video upload isn't available yet even though some video-related fields
exist in the system for later). Every upload gets:

- A **category** (Photo/Document/Video/Report).
- An optional link to a project and/or activity it documents.
- A description and comma-separated keywords, both searchable from the
  archive's search bar.

Files are private by default — only people with access to the linked
project (or the uploader, or an admin/leadership) can view or download
them. Uploading doesn't require any special approval step; that's a
separate, later action (see Public Gallery).

## Public Gallery

A **separate**, publicly-visible subset of the archive, for things BFDO
wants to share outside the organization (no sign-in required to view it).
Getting something there is a two-step process, and the two steps are
deliberately done by different sets of people:

1. **Submit for public gallery** — anyone who can upload media (Admin,
   Project Manager, Coordinator) can submit one of their own uploads.
   This does *not* make it public yet.
2. **Approve** — only an Admin or Leadership can actually approve a
   submission (and they can add a public-facing caption when they do).
   Until approved, the item stays private; once approved, it appears on
   the public gallery page immediately.

An admin/leadership user can also **revoke** something that was previously
approved, which pulls it off the public gallery immediately. Revoking
doesn't delete the file — it's still in the private archive, just no
longer public.

If nothing seems to be showing up on the public gallery page at all (even
things you know were approved), check with an administrator — there's an
organization-wide "public gallery enabled" switch under Settings that can
take the whole public page offline temporarily without touching any
individual approval.

## Reports

Four report types, each filterable by date range and/or project:
**Activities**, **Task status**, **Archive uploads**, and **Gallery
approvals**. The data shown is always computed live from current records —
nothing here is a stale cached snapshot. Every report has an **Export
CSV** button that downloads exactly what's on screen (same filters, same
permission scoping) as a spreadsheet file.

Project Managers and Coordinators see reports scoped to their own/assigned
projects; Admin and Leadership see everything organization-wide. The
**Gallery approvals** report is the one exception — it's Admin/Leadership
only, since the approval workflow itself works that way.

## Team (Admin only)

Create accounts, edit someone's role or department, deactivate/reactivate
an account, and reset a user's password. Deactivating someone signs them
out everywhere immediately — not just the account page, their actual
browser session stops working on their very next click. There's
deliberately no way to demote your own account away from System
Administrator (to avoid accidentally locking yourself, or the whole
organization, out).

## Audit Logs (Admin only)

A read-only, chronological record of sensitive actions taken across the
system — who did what, when, to what record. Filterable by actor, action
type, target type, and date range. This log is append-only by design:
nothing in the system can edit or delete an entry once it's written, so it
stays trustworthy as a record of what actually happened.

## Settings (Admin only)

Organization-wide configuration: the organization's display name, a
support contact email, and the public gallery on/off switch described
above. Changes here apply immediately, organization-wide, to everyone —
there's no per-user override.

## Something looks wrong — now what?

- **"Not found" on a page you expected to see** — almost always a
  permissions issue, not a broken link: either your role doesn't have
  access to that module, or (for project-scoped pages) you're not
  currently assigned to that specific project. Ask an administrator.
- **A module is missing from your sidebar entirely** — same thing; the
  sidebar only ever shows what your role can actually use, deliberately
  (no dead links to things you'd just get blocked from anyway).
- **You uploaded the wrong file or made a mistake on a record** — most
  records can be edited after the fact (look for an Edit button). Projects
  and activities can be archived (removing them from active lists without
  erasing history) but there is deliberately no "delete" function anywhere
  in the system — records are kept for history/audit purposes, never
  removed. If something was entered by mistake and genuinely shouldn't
  exist, correct its details via Edit rather than expecting it to be
  deletable.
