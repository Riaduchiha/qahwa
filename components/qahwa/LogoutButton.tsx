"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/qahwa/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="mt-auto rounded-lg px-3 py-2 text-left font-display text-sm text-qahwa-blanc/50 hover:bg-white/5 hover:text-qahwa-blanc"
    >
      Se déconnecter
    </button>
  );
}
