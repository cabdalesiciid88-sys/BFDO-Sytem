"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type StatusBarDatum = { label: string; value: number };

/**
 * Single-series horizontal bar chart for a status breakdown (project
 * status, task status, …). One hue — the category axis already labels
 * each bar, so no legend/categorical palette is needed (see dataviz skill:
 * "color follows the entity" — a single series needs no legend box).
 */
export function StatusBarChart({ data }: { data: StatusBarDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={110}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--popover-foreground)",
          }}
        />
        {/* --chart-1 is the palette's lightest step (oklch L 0.87) — nearly
            invisible against a white card in light mode. --chart-3 is a
            mid-gray with real contrast against both the light and dark card
            background, still within the single-hue grayscale palette. */}
        <Bar dataKey="value" fill="var(--chart-3)" radius={[0, 4, 4, 0]} maxBarSize={22}>
          <LabelList dataKey="value" position="right" style={{ fill: "var(--foreground)", fontSize: 12 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
