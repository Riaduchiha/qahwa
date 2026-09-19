"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function DuoLobbyPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"choix" | "creer" | "rejoindre">("choix");
  const [nickname, setNickname] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createGame() {
    if (!nickname.trim()) {
      setError("Entre ton prenom.");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const code = genCode();

    const { data: game, error: gameError } = await supabase
      .from("duo_games")
      .insert({ code })
      .select()
      .single();

    if (gameError || !game) {
      setError("Erreur, reessaie.");
      setLoading(false);
      return;
    }

    await supabase.from("duo_players").insert({
      game_id: game.id,
      player_number: 1,
      nickname: nickname.trim(),
    });

    sessionStorage.setItem(
      `qahwa-duo-${code}`,
      JSON.stringify({ gameId: game.id, playerNumber: 1 })
    );

    router.push(`/play/duo/mot-mystere/${code}`);
  }

  async function joinGame() {
    if (!nickname.trim() || joinCode.trim().length < 4) {
      setError("Entre ton prenom et le code.");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const code = joinCode.trim().toUpperCase();

    const { data: game } = await supabase
      .from("duo_games")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (!game) {
      setError("Code introuvable.");
      setLoading(false);
      return;
    }

    const { data: existingPlayer2 } = await supabase
      .from("duo_players")
      .select("id")
      .eq("game_id", game.id)
      .eq("player_number", 2)
      .maybeSingle();

    if (existingPlayer2) {
      setError("Cette partie est deja complete.");
      setLoading(false);
      return;
    }

    await supabase.from("duo_players").insert({
      game_id: game.id,
      player_number: 2,
      nickname: nickname.trim(),
    });

    await supabase
      .from("duo_games")
      .update({ status: "ready" })
      .eq("id", game.id);

    sessionStorage.setItem(
      `qahwa-duo-${code}`,
      JSON.stringify({ gameId: game.id, playerNumber: 2 })
    );

    router.push(`/play/duo/mot-mystere/${code}`);
  }

  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-6 bg-qahwa-noir px-5 py-10 text-center">
      <Link
        href="/play/duo"
        className="font-display text-xs uppercase text-qahwa-blanc/60 hover:text-qahwa-orange"
      >
        &lsaquo; Retour
      </Link>
      <p className="font-display text-xs uppercase tracking-[0.3em] text-qahwa-orange">
        Qahwa Play
      </p>
      <h1 className="font-display text-3xl uppercase text-qahwa-blanc">
        Trouve mon sujet
      </h1>
      <p className="max-w-xs text-sm text-qahwa-blanc/60">
        Decris le mot a ton binome sans le dire. Il essaie de deviner. 60
        secondes chacun, le meilleur duo gagne.
      </p>

      {mode === "choix" && (
        <div className="mt-4 flex w-full max-w-xs flex-col gap-3">
          <button
            onClick={() => setMode("creer")}
            className="qahwa-cta rounded-full border-2 border-qahwa-noir bg-qahwa-orange py-3 font-display uppercase text-qahwa-noir shadow-brutal"
          >
            Creer une partie
          </button>
          <button
            onClick={() => setMode("rejoindre")}
            className="rounded-full border-2 border-qahwa-blanc/20 bg-white/5 py-3 font-display uppercase text-qahwa-blanc"
          >
            Rejoindre avec un code
          </button>
        </div>
      )}

      {mode === "creer" && (
        <div className="mt-4 flex w-full max-w-xs flex-col gap-3">
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Ton prenom"
            className="rounded-lg border-2 border-qahwa-blanc/20 bg-white/5 px-3 py-2 text-sm text-qahwa-blanc placeholder:text-qahwa-blanc/40"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={createGame}
            disabled={loading}
            className="qahwa-cta rounded-full border-2 border-qahwa-noir bg-qahwa-orange py-3 font-display uppercase text-qahwa-noir shadow-brutal disabled:opacity-60"
          >
            {loading ? "Creation..." : "Creer"}
          </button>
        </div>
      )}

      {mode === "rejoindre" && (
        <div className="mt-4 flex w-full max-w-xs flex-col gap-3">
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Ton prenom"
            className="rounded-lg border-2 border-qahwa-blanc/20 bg-white/5 px-3 py-2 text-sm text-qahwa-blanc placeholder:text-qahwa-blanc/40"
          />
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Code (ex: A3F9)"
            maxLength={4}
            className="rounded-lg border-2 border-qahwa-blanc/20 bg-white/5 px-3 py-2 text-center text-lg font-display uppercase tracking-widest text-qahwa-blanc placeholder:text-qahwa-blanc/40"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={joinGame}
            disabled={loading}
            className="qahwa-cta rounded-full border-2 border-qahwa-noir bg-qahwa-orange py-3 font-display uppercase text-qahwa-noir shadow-brutal disabled:opacity-60"
          >
            {loading ? "Connexion..." : "Rejoindre"}
          </button>
        </div>
      )}
    </section>
  );
}