import { FileText } from "lucide-react";
import { listPublicGalleryItems } from "@/features/gallery/queries";

export const metadata = {
  title: "Public Gallery — BFDO Management System",
};

// Approvals change at runtime (admins approve/revoke), so this must never be
// statically prerendered at build time — that also avoids needing a live DB
// connection during `next build`.
export const dynamic = "force-dynamic";

export default async function PublicGalleryPage() {
  const items = await listPublicGalleryItems();

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Public Gallery</h1>
        <p className="text-sm text-muted-foreground">
          Photos and documents BFDO has shared publicly.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing has been published yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <a
              key={item.id}
              href={`/api/public/media/${item.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden rounded-lg border hover:border-foreground/30"
            >
              <div className="flex aspect-square items-center justify-center bg-muted">
                {item.category === "PHOTO" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/public/media/${item.id}/thumbnail`}
                    alt={item.caption ?? ""}
                    className="size-full object-cover"
                  />
                ) : (
                  <FileText className="size-10 text-muted-foreground" />
                )}
              </div>
              {item.caption ? (
                <div className="p-2">
                  <p className="truncate text-sm">{item.caption}</p>
                </div>
              ) : null}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
