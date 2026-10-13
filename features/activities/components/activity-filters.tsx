import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const nativeSelectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/** Plain GET form — same rationale as features/projects/components/project-filters.tsx. */
export function ActivityFilters({
  search,
  status,
  category,
  projectId,
  categories,
  projects,
}: {
  search?: string;
  status?: string;
  category?: string;
  projectId?: string;
  categories: string[];
  projects: { id: string; title: string }[];
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-48">
        <Input name="search" placeholder="Search title, code, location…" defaultValue={search ?? ""} />
      </div>
      {projects.length > 0 ? (
        <select name="projectId" defaultValue={projectId ?? ""} className={nativeSelectClassName + " w-48"}>
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
      ) : null}
      <select name="status" defaultValue={status ?? ""} className={nativeSelectClassName + " w-36"}>
        <option value="">All statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="ARCHIVED">Archived</option>
      </select>
      {categories.length > 0 ? (
        <select
          name="category"
          defaultValue={category ?? ""}
          className={nativeSelectClassName + " w-40"}
        >
          <option value="">All categories</option>
          {categories.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      ) : null}
      <Button type="submit" variant="outline">
        Filter
      </Button>
    </form>
  );
}
