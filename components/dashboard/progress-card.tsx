import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ACCENT_STYLES = {
  violet: { badge: "bg-primary/15 text-primary", bar: "bg-primary" },
  pink: { badge: "bg-brand-pink/15 text-brand-pink", bar: "bg-brand-pink" },
  neutral: { badge: "bg-muted text-muted-foreground", bar: "bg-muted-foreground" },
} as const;

export function ProgressCard({
  label,
  icon: Icon,
  value,
  total,
  accent,
}: {
  label: string;
  icon: LucideIcon;
  value: number;
  total: number;
  accent: "violet" | "pink" | "neutral";
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const styles = ACCENT_STYLES[accent];

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${styles.badge}`}>
            <Icon className="size-4" />
          </span>
          <p className="text-sm font-medium">{label}</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-muted-foreground">
          {value} of {total}
        </p>
      </CardContent>
    </Card>
  );
}
