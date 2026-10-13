import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const nativeSelectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/** Plain GET form — same rationale as features/projects/components/project-filters.tsx. */
export function MediaFilters({
  search,
  category,
  projectId,
  projects,
}: {
  search?: string;
  category?: string;
  projectId?: string;
  projects: { id: string; title: string }[];
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-48">
        <Input name="search" placeholder="Search filename, description, keywords…" defaultValue={search ?? ""} />
      </div>
      <select name="category" defaultValue={category ?? ""} className={nativeSelectClassName + " w-36"}>
        <option value="">All categories</option>
        <option value="PHOTO">Photo</option>
        <option value="DOCUMENT">Document</option>
        <option value="REPORT">Report</option>
      </select>
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
      <Button type="submit" variant="outline">
        Filter
      </Button>
    </form>
  );
}
