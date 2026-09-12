import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/types/database";

// Utilisé par le layout protégé /qahwa pour vérifier la session
// (brief §12 : authentification obligatoire pour la plateforme propriétaire).
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key",
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
set(name: string, value: string, options: CookieOptions) {
  try {
    cookieStore.set({ name, value, ...options });
  } catch {
    // Les Server Components ne peuvent pas modifier les cookies.
  }
},
remove(name: string, options: CookieOptions) {
  try {
    cookieStore.set({ name, value: "", ...options });
  } catch {
    // Les Server Components ne peuvent pas modifier les cookies.
  }
},
      },
    }
  );
}
