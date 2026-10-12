import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";

// The public marketing page + media gallery (spec section 11) lands in
// Phase 4 under a (public) route group. Until then, "/" just routes signed
// -in staff to the dashboard and everyone else to sign-in — no placeholder
// landing content.
export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
