import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Utilisé côté serveur pour les pages publiques en lecture seule
// (menu, accueil...). Pas besoin de cookies ici : ces pages ne
// dépendent d'aucune session utilisateur.
// fetch en "no-store" explicite : évite que Next.js mette en cache une
// ancienne réponse Supabase (ex: menu affichant des données périmées).
export function createSupabasePublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key",
    {
      global: {
        fetch: (url, options) =>
          fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );
}
