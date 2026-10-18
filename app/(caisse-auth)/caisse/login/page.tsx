"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function CaisseLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError("Email ou mot de passe incorrect.");
        return;
      }

      router.replace("/caisse");
      router.refresh();
    } catch {
      setError("Impossible de se connecter. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-5 py-10 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1B1B1B] p-7 shadow-2xl sm:p-9">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#FF6B00]">
            QAHWA
          </p>

          <h1 className="mt-4 font-display text-3xl uppercase">
            Espace caisse
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#9A9A9A]">
            Connecte-toi avec ton compte professionnel pour accéder à la caisse.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="caisse-email"
              className="mb-2 block text-sm font-medium"
            >
              Adresse email
            </label>

            <input
              id="caisse-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@exemple.com"
              className="min-h-12 w-full rounded-xl border border-white/10 bg-[#121212] px-4 text-base text-white outline-none transition placeholder:text-[#666] focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20"
            />
          </div>

          <div>
            <label
              htmlFor="caisse-password"
              className="mb-2 block text-sm font-medium"
            >
              Mot de passe
            </label>

            <input
              id="caisse-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ton mot de passe"
              className="min-h-12 w-full rounded-xl border border-white/10 bg-[#121212] px-4 text-base text-white outline-none transition placeholder:text-[#666] focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="min-h-12 w-full rounded-xl bg-[#FF6B00] px-4 font-display text-sm uppercase text-black transition hover:bg-[#ff8126] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Connexion..." : "Accéder à la caisse"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#777]">
          Accès réservé au personnel autorisé.
        </p>
      </section>
    </main>
  );
}
