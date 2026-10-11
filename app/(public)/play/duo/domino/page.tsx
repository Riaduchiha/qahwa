
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 4; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

export default function DominoDuoLobbyPage() {
  const router = useRouter();

  const [mode, setMode] = useState<
    "choix" | "creer" | "rejoindre"
  >("choix");

  const [nickname, setNickname] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createGame() {
    if (!nickname.trim()) {
      setError("Entre ton prénom.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase =
        createSupabaseBrowserClient() as any;

      const code = genCode();

      const {
        data: game,
        error: gameError,
      } = await supabase
        .from("duo_domino_games")
        .insert({
          code,
          status: "waiting",
          current_player: 1,
          board: [],
          boneyard: [],
          winner: null,
        })
        .select()
        .single();

      if (gameError || !game) {
        console.error(gameError);

        setError(
          "Erreur lors de la création de la partie.",
        );

        setLoading(false);
        return;
      }

      const {
        error: playerError,
      } = await supabase
        .from("duo_domino_players")
        .insert({
          game_id: game.id,
          player_number: 1,
          nickname: nickname.trim(),
          hand: [],
          score: 0,
        });

      if (playerError) {
        console.error(playerError);

        setError(
          "Erreur lors de la création du joueur.",
        );

        setLoading(false);
        return;
      }

      sessionStorage.setItem(
        `qahwa-domino-${code}`,
        JSON.stringify({
          gameId: game.id,
          playerNumber: 1,
        }),
      );

      router.push(
        `/play/duo/domino/${code}`,
      );
    } catch (err) {
      console.error(err);

      setError(
        "Une erreur est survenue.",
      );

      setLoading(false);
    }
  }

  async function joinGame() {
    if (
      !nickname.trim() ||
      joinCode.trim().length < 4
    ) {
      setError(
        "Entre ton prénom et le code.",
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase =
        createSupabaseBrowserClient() as any;

      const code =
        joinCode.trim().toUpperCase();

      const {
        data: game,
        error: gameError,
      } = await supabase
        .from("duo_domino_games")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (gameError) {
        console.error(gameError);

        setError(
          "Impossible de trouver cette partie.",
        );

        setLoading(false);
        return;
      }

      if (!game) {
        setError("Code introuvable.");
        setLoading(false);
        return;
      }

      const {
        data: existingPlayer2,
        error: playerCheckError,
      } = await supabase
        .from("duo_domino_players")
        .select("id")
        .eq("game_id", game.id)
        .eq("player_number", 2)
        .maybeSingle();

      if (playerCheckError) {
        console.error(
          playerCheckError,
        );

        setError(
          "Impossible de vérifier la partie.",
        );

        setLoading(false);
        return;
      }

      if (existingPlayer2) {
        setError(
          "Cette partie est déjà complète.",
        );

        setLoading(false);
        return;
      }

      const {
        data: player2,
        error: insertPlayerError,
      } = await supabase
        .from("duo_domino_players")
        .insert({
          game_id: game.id,
          player_number: 2,
          nickname: nickname.trim(),
          hand: [],
          score: 0,
        })
        .select()
        .single();

      if (
        insertPlayerError ||
        !player2
      ) {
        console.error(
          insertPlayerError,
        );

        setError(
          "Impossible de rejoindre la partie.",
        );

        setLoading(false);
        return;
      }

      await supabase
        .from("duo_domino_games")
        .update({
          status: "waiting",
        })
        .eq("id", game.id);

      /*
       * IMPORTANT :
       * On sauvegarde un OBJET JSON.
       * La page de jeu devra lire playerNumber
       * dans cet objet.
       */
      sessionStorage.setItem(
        `qahwa-domino-${code}`,
        JSON.stringify({
          gameId: game.id,
          playerNumber: 2,
        }),
      );

      router.push(
        `/play/duo/domino/${code}`,
      );
    } catch (err) {
      console.error(err);

      setError(
        "Une erreur est survenue.",
      );

      setLoading(false);
    }
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
        Domino
      </h1>

      <p className="max-w-xs text-sm text-qahwa-blanc/60">
        Affronte ton binôme à distance.
        Deux téléphones, une seule partie.
      </p>

      {mode === "choix" && (
        <div className="mt-4 flex w-full max-w-xs flex-col gap-3">
          <button
            type="button"
            onClick={() =>
              setMode("creer")
            }
            className="qahwa-cta rounded-full border-2 border-qahwa-noir bg-qahwa-orange py-3 font-display uppercase text-qahwa-noir shadow-brutal"
          >
            Créer une partie
          </button>

          <button
            type="button"
            onClick={() =>
              setMode("rejoindre")
            }
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
            onChange={(e) =>
              setNickname(e.target.value)
            }
            placeholder="Ton prénom"
            className="rounded-lg border-2 border-qahwa-blanc/20 bg-white/5 px-3 py-2 text-sm text-qahwa-blanc placeholder:text-qahwa-blanc/40"
          />

          {error && (
            <p className="text-xs text-red-400">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={createGame}
            disabled={loading}
            className="qahwa-cta rounded-full border-2 border-qahwa-noir bg-qahwa-orange py-3 font-display uppercase text-qahwa-noir shadow-brutal disabled:opacity-60"
          >
            {loading
              ? "Création..."
              : "Créer"}
          </button>
        </div>
      )}

      {mode === "rejoindre" && (
        <div className="mt-4 flex w-full max-w-xs flex-col gap-3">
          <input
            value={nickname}
            onChange={(e) =>
              setNickname(e.target.value)
            }
            placeholder="Ton prénom"
            className="rounded-lg border-2 border-qahwa-blanc/20 bg-white/5 px-3 py-2 text-sm text-qahwa-blanc placeholder:text-qahwa-blanc/40"
          />

          <input
            value={joinCode}
            onChange={(e) =>
              setJoinCode(
                e.target.value.toUpperCase(),
              )
            }
            placeholder="Code (ex: A3F9)"
            maxLength={4}
            className="rounded-lg border-2 border-qahwa-blanc/20 bg-white/5 px-3 py-2 text-center text-lg font-display uppercase tracking-widest text-qahwa-blanc placeholder:text-qahwa-blanc/40"
          />

          {error && (
            <p className="text-xs text-red-400">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={joinGame}
            disabled={loading}
            className="qahwa-cta rounded-full border-2 border-qahwa-noir bg-qahwa-orange py-3 font-display uppercase text-qahwa-noir shadow-brutal disabled:opacity-60"
          >
            {loading
              ? "Connexion..."
              : "Rejoindre"}
          </button>
        </div>
      )}
    </section>
  );
}

