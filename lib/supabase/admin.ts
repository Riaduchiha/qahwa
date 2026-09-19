import { createClient } from "@supabase/supabase-js";

// Client "admin" : cle service_role, JAMAIS exposee au navigateur.
// Utiliser uniquement dans des fichiers cote serveur (route.ts, page.tsx sans "use client").
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}