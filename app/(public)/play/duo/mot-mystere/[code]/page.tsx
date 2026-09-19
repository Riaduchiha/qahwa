"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const WORD_BANK = [
  "cappuccino", "croissant", "wifi", "addition", "terrasse", "sucre",
  "lait", "glacon", "chaise", "tasse", "cuillere", "chocolat chaud",
  "the", "jus d'orange", "musique", "parapluie", "portefeuille",
  "telephone", "batterie", "facture", "pourboire", "fenetre", "rideau",
  "miroir", "escalier", "ventilateur", "horloge", "journal", "livre",
  "stylo", "carte de fidelite", "dessert", "gateau", "chantilly",
  "paille", "serviette", "sirop", "cannelle", "mousse", "plateau",
];

const ROUND_SECONDS = 60;
const TOTAL_ROUNDS = 2;

interface DuoGame {
  id: string;
  code: string;
  status: "waiting" | "ready" | "playing" | "finished";
  current_round: number;
  describer_player: number;
  round_end_at: string | null;
}

interface DuoPlayer {
  id: string;
  player_number: number;
  nickname: string;
}

interface DuoWord {
  id: string;
  round: number;
  word: string;
  order_index: number;
  status: "pending" | "found" | "skipped";
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = temp;
  }
  return a;
}

export default function DuoGamePage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string)?.toUpperCase();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [session, setSession] = useState<{ gameId: string; playerNumber: number } | null>(null);
  const [game, setGame] = useState<DuoGame | null>(null);
  const [players, setPlayers] = useState<DuoPlayer[]>([]);
  const [words, setWords] = useState<DuoWord[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const startingRef = useRef(false);
  const endingRef = useRef(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(`qahwa-duo-${code}`);
    if (!raw) {
      router.replace("/play/duo/mot-mystere");
      return;
    }
    setSession(JSON.parse(raw));
  }, [code, router]);

  const loadAll = useCallback(async () => {
    if (!session) return;
    const { data: g } = await supabase
      .from("duo_games")
      .select("*")
      .eq("id", session.gameId)
      .maybeSingle();
    if (g) setGame(g as DuoGame);

    const { data: p } = await supabase
      .from("duo_players")
      .select("id, player_number, nickname")
      .eq("game_id", session.gameId)
      .order("player_number");
    if (p) setPlayers(p as DuoPlayer[]);

    const { data: w } = await supabase
      .from("duo_words")
      .select("*")
      .eq("game_id", session.gameId)
      .order("order_index");
    if (w) setWords(w as DuoWord[]);
  }, [session, supabase]);

  useEffect(() => {
    if (!session) return;
    loadAll();

    const channel = supabase
      .channel(`duo-game-${session.gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "duo_games", filter: `id=eq.${session.gameId}` },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "duo_players", filter: `game_id=eq.${session.gameId}` },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "duo_words", filter: `game_id=eq.${session.gameId}` },
        () => loadAll()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, supabase, loadAll]);

  useEffect(() => {
    if (!game || game.status !== "playing" || !game.round_end_at) return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(game.round_end_at as string).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);

      if (remaining === 0 && !endingRef.current) {
        endingRef.current = true;
        endRound();
      }
    }, 250);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.status, game?.round_end_at]);

  useEffect(() => {
    endingRef.current = false;
  }, [game?.current_round]);

  const me = players.find((p) => p.player_number === session?.playerNumber);
  const teammate = players.find((p) => p.player_number !== session?.playerNumber);
  const isDescriber = game?.describer_player === session?.playerNumber;

  async function startRound() {
    if (!game || !session || startingRef.current) return;
    startingRef.current = true;

    const shuffled = shuffle(WORD_BANK).slice(0, 20);
    await supabase.from("duo_words").insert(
      shuffled.map((word, i) => ({
        game_id: game.id,
        round: game.current_round,
        word,
        order_index: i,
        status: "pending",
      }))
    );

    await supabase
      .from("duo_games")
      .update({
        status: "playing",
        round_end_at: new Date(Date.now() + ROUND_SECONDS * 1000).toISOString(),
      })
      .eq("id", game.id);

    startingRef.current = false;
  }

  async function endRound() {
    if (!game) return;
    const nextRound = game.current_round + 1;
    if (nextRound > TOTAL_ROUNDS) {
      await supabase
        .from("duo_games")
        .update({ status: "finished" })
        .eq("id", game.id)
        .eq("status", "playing");
    } else {
      await supabase
        .from("duo_games")
        .update({
          status: "ready",
          current_round: nextRound,
          describer_player: game.describer_player === 1 ? 2 : 1,
          round_end_at: null,
        })
        .eq("id", game.id)
        .eq("status", "playing");
    }
  }

  async function markFound(wordId: string) {
    await supabase.from("duo_words").update({ status: "found" }).eq("id", wordId);
  }

  async function skipWord(wordId: string) {
    await supabase.from("duo_words").update({ status: "skipped" }).eq("id", wordId);
  }

  if (!game || !session) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-qahwa-noir">
        <p className="text-sm text-qahwa-blanc/60">Chargement...</p>
      </section>
    );
  }

  const currentRoundWords = words.filter((w) => w.round === game.current_round);
  const currentWord = currentRoundWords.find((w) => w.status === "pending");
  const foundThisRound = currentRoundWords.filter((w) => w.status === "found").length;
  const totalFound = words.filter((w) => w.status === "found").length;

  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-6 bg-qahwa-noir px-5 py-10 text-center">
      <Link
        href="/play/modes"
        className="font-display text-xs uppercase text-qahwa-blanc/60 hover:text-qahwa-orange"
      >
        &lsaquo; Quitter
      </Link>
      <p className="font-display text-xs uppercase tracking-[0.3em] text-qahwa-orange">
        Trouve mon sujet — {code}
      </p>

      {game.status === "waiting" && (
        <div className="flex flex-col items-center gap-3">
          <h1 className="font-display text-2xl uppercase text-qahwa-blanc">
            En attente d&apos;un 2e joueur...
          </h1>
          <p className="text-sm text-qahwa-blanc/60">
            Donne le code <span className="text-qahwa-orange">{code}</span> a
            ton binome pour qu&apos;il rejoigne.
          </p>
        </div>
      )}

      {game.status === "ready" && (
        <div className="flex flex-col items-center gap-4">
          <h1 className="font-display text-2xl uppercase text-qahwa-blanc">
            Manche {game.current_round} / {TOTAL_ROUNDS}
          </h1>
          <p className="text-sm text-qahwa-blanc/60">
            {isDescriber
              ? "C'est a toi de decrire les mots !"
              : `${players.find((p) => p.player_number === game.describer_player)?.nickname ?? "Ton binome"} va decrire, essaie de deviner.`}
          </p>
          {isDescriber && (
            <button
              onClick={startRound}
              className="qahwa-cta rounded-full border-2 border-qahwa-noir bg-qahwa-orange px-8 py-3 font-display uppercase text-qahwa-noir shadow-brutal"
            >
              Commencer mon tour
            </button>
          )}
        </div>
      )}

      {game.status === "playing" && (
        <div className="flex w-full max-w-sm flex-col items-center gap-4">
          <div className="flex items-center gap-4 text-sm text-qahwa-blanc/70">
            <span>⏱ {secondsLeft}s</span>
            <span>Trouves : {foundThisRound}</span>
          </div>

          {isDescriber && currentWord && (
            <>
              <div className="w-full rounded-2xl border-2 border-qahwa-orange bg-qahwa-orange/10 p-8">
                <p className="font-display text-3xl uppercase text-qahwa-blanc">
                  {currentWord.word}
                </p>
              </div>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => skipWord(currentWord.id)}
                  className="flex-1 rounded-full border-2 border-qahwa-blanc/20 bg-white/5 py-3 font-display uppercase text-qahwa-blanc"
                >
                  Passer
                </button>
                <button
                  onClick={() => markFound(currentWord.id)}
                  className="flex-1 rounded-full border-2 border-qahwa-noir bg-qahwa-orange py-3 font-display uppercase text-qahwa-noir shadow-brutal"
                >
                  Trouve !
                </button>
              </div>
            </>
          )}

          {isDescriber && !currentWord && (
            <p className="text-sm text-qahwa-blanc/60">
              Plus de mots pour cette manche !
            </p>
          )}

          {!isDescriber && (
            <div className="w-full rounded-2xl border-2 border-qahwa-blanc/15 bg-white/5 p-10">
              <p className="font-display text-lg uppercase text-qahwa-blanc">
                {players.find((p) => p.player_number === game.describer_player)?.nickname} decrit...
              </p>
              <p className="mt-2 text-sm text-qahwa-blanc/60">
                Ecoute et devine a voix haute !
              </p>
            </div>
          )}
        </div>
      )}

      {game.status === "finished" && (
        <div className="flex flex-col items-center gap-4">
          <h1 className="font-display text-3xl uppercase text-qahwa-blanc">
            Partie terminee !
          </h1>
          <p className="text-lg text-qahwa-orange">
            {totalFound} mots trouves au total
          </p>
          <div className="flex gap-3">
            <Link
              href="/play/duo/mot-mystere"
              className="qahwa-cta rounded-full border-2 border-qahwa-noir bg-qahwa-orange px-6 py-3 font-display uppercase text-qahwa-noir shadow-brutal"
            >
              Rejouer
            </Link>
            <Link
              href="/play/modes"
              className="rounded-full border-2 border-qahwa-blanc/20 bg-white/5 px-6 py-3 font-display uppercase text-qahwa-blanc"
            >
              Quitter
            </Link>
          </div>
        </div>
      )}

      {me && teammate && game.status !== "waiting" && (
        <p className="text-xs text-qahwa-blanc/40">
          {me.nickname} &amp; {teammate.nickname}
        </p>
      )}
    </section>
  );
}