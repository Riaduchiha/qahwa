import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Écran dédié tablette (barista/bar/cuisine) — volontairement SANS la
// barre latérale de QAHWA : gros boutons, plein écran, navigation
// minimale (brief : "interface optimisée pour tablette, très lisible").
// Toujours protégé par la même authentification que le reste de QAHWA.
export default async function KdsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/qahwa/login");
  }

  return <div className="min-h-screen bg-qahwa-black">{children}</div>;
}
