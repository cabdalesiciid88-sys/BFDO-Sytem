import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const nativeSelectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/** Plain GET form — same rationale as features/projects/components/project-filters.tsx. */
export function TaskFilters({
  search,
  status,
  priority,
  projectId,
  onlyMine,
  projects,
}: {
  search?: string;
  status?: string;
  priority?: string;
  projectId?: string;
  onlyMine?: string;
  projects: { id: string; title: string }[];
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-48">
        <Input name="search" placeholder="Search title or description…" defaultValue={search ?? ""} />
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
        <option value="TODO">To do</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="BLOCKED">Blocked</option>
        <option value="COMPLETED">Completed</option>
      </select>
      <select name="priority" defaultValue={priority ?? ""} className={nativeSelectClassName + " w-32"}>
        <option value="">All priorities</option>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="URGENT">Urgent</option>
      </select>
      <label className="flex h-8 items-center gap-1.5 text-sm">
        <input type="checkbox" name="onlyMine" value="1" defaultChecked={onlyMine === "1"} className="size-4" />
        My tasks
      </label>
      <Button type="submit" variant="outline">
        Filter
      </Button>
    </form>
  );
}
