"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadMedia, type MediaFormState } from "@/features/archive/actions";
import { MEDIA_CATEGORY_VALUES } from "@/features/archive/schema";

type SelectableProject = { id: string; title: string };
type SelectableActivity = { id: string; title: string };

const CATEGORY_LABELS: Record<string, string> = {
  PHOTO: "Photo",
  DOCUMENT: "Document",
  REPORT: "Report",
};

export function UploadForm({
  projects,
  activities,
}: {
  projects: SelectableProject[];
  activities: SelectableActivity[];
}) {
  const [state, formAction, isPending] = useActionState<MediaFormState, FormData>(
    uploadMedia,
    null,
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="file">File</Label>
          <input
            id="file"
            name="file"
            type="file"
            required
            disabled={isPending}
            accept="image/jpeg,image/png,application/pdf,.docx,.xlsx"
            className="flex h-9 w-full rounded-lg border border-input bg-transparent text-sm file:mr-3 file:h-full file:border-0 file:border-r file:border-input file:bg-muted file:px-3 file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="text-xs text-muted-foreground">
            JPEG/PNG photos or PDF/Word/Excel documents only.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            name="category"
            required
            defaultValue="PHOTO"
            items={MEDIA_CATEGORY_VALUES.map((value) => ({ value, label: CATEGORY_LABELS[value] }))}
          >
            <SelectTrigger id="category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEDIA_CATEGORY_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {CATEGORY_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectId">Project</Label>
          <Select
            name="projectId"
            items={projects.map((project) => ({ value: project.id, label: project.title }))}
          >
            <SelectTrigger id="projectId" className="w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {activities.length > 0 ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="activityId">Activity</Label>
            <Select
              name="activityId"
              items={activities.map((activity) => ({ value: activity.id, label: activity.title }))}
            >
              <SelectTrigger id="activityId" className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {activities.map((activity) => (
                  <SelectItem key={activity.id} value={activity.id}>
                    {activity.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" disabled={isPending} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="keywords">Keywords</Label>
          <Input
            id="keywords"
            name="keywords"
            placeholder="Comma-separated, for search"
            disabled={isPending}
          />
        </div>
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Uploading…" : "Upload"}
      </Button>
    </form>
  );
}
