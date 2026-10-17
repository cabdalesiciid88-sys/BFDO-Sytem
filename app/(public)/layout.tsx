import Link from "next/link";

// No auth required anywhere under this route group — only
// features/gallery's public-safe query/route handlers may be used here.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <Link href="/gallery" className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            B
          </span>
          BFDO Management System
        </Link>
        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
          Staff sign in
        </Link>
      </header>
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
