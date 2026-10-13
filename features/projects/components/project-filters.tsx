import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const nativeSelectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const PROJECT_STATUS_OPTIONS = ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"];

/**
 * Plain GET form — no client JS needed to filter/search the project list,
 * consistent with this being a server-rendered table (see app/(app)/projects/page.tsx).
 */
export function ProjectFilters({
  search,
  status,
  category,
  categories,
}: {
  search?: string;
  status?: string;
  category?: string;
  categories: string[];
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-48">
        <Input name="search" placeholder="Search title, code, location…" defaultValue={search ?? ""} />
      </div>
      <select name="status" defaultValue={status ?? ""} className={nativeSelectClassName + " w-40"}>
        <option value="">All statuses</option>
        {PROJECT_STATUS_OPTIONS.map((value) => (
          <option key={value} value={value}>
            {value.replaceAll("_", " ")}
          </option>
        ))}
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
