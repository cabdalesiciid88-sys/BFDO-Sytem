import Link from "next/link";

const TONE_GRADIENT = {
  violet: "from-primary to-[color-mix(in_oklch,var(--primary)_55%,black)]",
  pink: "from-brand-pink to-[color-mix(in_oklch,var(--brand-pink)_55%,black)]",
} as const;

const TONE_FOREGROUND = {
  violet: "text-primary-foreground",
  pink: "text-brand-pink-foreground",
} as const;

export function HeroStatCard({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  tone: "violet" | "pink";
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col justify-between gap-6 rounded-2xl bg-gradient-to-br p-5 shadow-sm transition-opacity hover:opacity-90 ${TONE_GRADIENT[tone]} ${TONE_FOREGROUND[tone]}`}
    >
      <span className="text-sm font-medium opacity-90">{label}</span>
      <span className="text-4xl font-bold">{value}</span>
    </Link>
  );
}
