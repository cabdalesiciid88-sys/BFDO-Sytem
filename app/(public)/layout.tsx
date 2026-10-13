import Link from "next/link";

// No auth required anywhere under this route group — only
// features/gallery's public-safe query/route handlers may be used here.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <Link href="/gallery" className="text-sm font-semibold">
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
