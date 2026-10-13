# Database Schema

Source of truth: `prisma/schema.prisma`. This document explains the tables
in plain language; regenerate understanding from the schema file if they
ever disagree.

Engine: MySQL. IDs are UUID strings (`CHAR(36)`, generated in application
code via `@default(uuid())` — MySQL itself has no native UUID generator
Prisma relies on here). Every table has `createdAt`/`updatedAt` where
mutation history matters.

## Identity & access

- **users** — one row per person. `role` is the global role (see
  `docs/permissions.md`); `status` is `INVITED` / `ACTIVE` / `DEACTIVATED`.
  Passwords are never stored in plaintext — only `passwordHash` (bcrypt).
- **departments** — optional grouping of users, for organizational context
  (not a permission boundary).
- **sessions** — one row per live login. Stores only a hash of the session
  token (the raw token is the httpOnly cookie value). Deleting a user's rows
  here logs them out everywhere, immediately.
- **password_reset_tokens** — one-time, expiring tokens for self-service
  password reset.

## Projects

- **projects** — the top-level unit of organizational work. Has one
  `manager` (a user) and a `status` lifecycle (`PLANNED → ACTIVE → ON_HOLD /
  COMPLETED → ARCHIVED`). Projects are archived, never deleted, once they
  have activities/media attached.
- **project_members** — junction table: which users are on a project, and
  in what capacity (`MANAGER` / `COORDINATOR` / `MEMBER`). This table is
  what "assigned to a project" means everywhere else in the app.

## Activity register

- **activities** — the core record of organizational work. Optionally
  linked to a project. Has a `responsible` user, an `activityDate` (the real
  date the work happened — distinct from `createdAt`, when it was entered),
  and a `status` (`ACTIVE`/`ARCHIVED`, never hard-deleted).
  `importedFromSource` / `importedAt` are only set when a historical record
  is entered after the fact, so the two dates are never confused.
- **activity_participants** — junction table: which users took part.

## Tasks

- **tasks** — assignable units of work, optionally tied to a project and/or
  a specific activity. `status`: `TODO → IN_PROGRESS → BLOCKED/COMPLETED`.

## Meetings & decisions

- **meetings** — a recorded meeting: agenda, notes, optional project link.
- **meeting_participants** — junction table.
- **meeting_attachments** — junction table linking a meeting to
  `media_assets` (e.g. minutes PDF, photos).
- **decisions** — a decision record, optionally tied to a meeting and/or
  project, with a responsible owner and a follow-up status.

## Reporting

- **reports** — a log of report *runs* (what type, what parameters, who ran
  it, when, and where any exported file was saved). The report's data is
  always computed live from current records; this table is history/audit,
  not a cache.

## Digital archive & public gallery

- **media_assets** — metadata for one uploaded file (photo/document/video/
  report). `storagePath` is a generated, non-guessable path on disk — never
  the user's original filename. `checksumSha256` supports integrity
  verification during backup/restore.
- **activity_media** / **project_media** — junction tables linking a media
  asset to the activity and/or project it documents (a file can be linked
  to both without duplicating the underlying bytes).
- **media_approvals** — the public-gallery workflow. One row per asset that
  has ever been submitted. `status`: `PENDING → APPROVED/REJECTED`, with
  `REVOKED` once an approved item is pulled back. The public gallery query
  is the *only* place in the app allowed to read `status = APPROVED` rows
  and must select nothing beyond `publicCaption` + a served image URL.

## Audit & notifications

- **audit_logs** — append-only. Records actor, action, target, and
  before/after JSON where applicable. No code path updates or deletes a row
  here (see `docs/permissions.md` rule 6).
- **notifications** — in-app notifications (task assigned, media submitted
  for review, etc.), per user.

## Administration

- **org_settings** — a singleton row (fixed primary key `"singleton"`)
  holding org-wide configuration an admin can change at runtime:
  organization name, support email, and `publicGalleryEnabled` (a kill
  switch — when false, the public gallery page and its byte-serving routes
  refuse to show anything, even already-approved items). Created on first
  read rather than via a seed step. Not a generic key-value settings table
  — fields are added here only once they have real wired-up behavior
  somewhere in the app, to avoid a settings page full of decorative
  options.

## Deliberately not modeled (yet)

- Video-specific transcoding/streaming metadata — v1 supports photo and
  document upload only; `MediaCategory.VIDEO` exists in the enum for
  forward compatibility but the upload UI doesn't expose it yet (see
  `docs/project-status.md`).
- Full-text search index (MySQL `FULLTEXT`) — v1 uses indexed `LIKE`
  queries on title/description/location/category, which is adequate at the
  expected scale (hundreds of activities/media per month). Can be added
  later as a non-breaking migration if search quality becomes a problem.
