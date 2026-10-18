"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Chess } from "chess.js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const PIECE_SYMBOLS: Record<string, string> = {
  p: "\u265F\uFE0E",
  r: "\u265C\uFE0E",
  n: "\u265E\uFE0E",
  b: "\u265D\uFE0E",
  q: "\u265B\uFE0E",
  k: "\u265A\uFE0E",
};
const FILES = "abcdefgh";

export default function EchecsDuoGamePage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();
  const supabase = createSupabaseBrowserClient() as any;

  const gameRef = useRef(new Chess());
  const [, setTick] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [status, setStatus] = useState<"waiting" | "playing" | "finished">("waiting");
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | null>(null);

  const game = gameRef.current;
  const role: "w" | "b" | "spectator" =
    playerNumber === 1 ? "w" : playerNumber === 2 ? "b" : "spectator";

  function rerender() {
    setTick((n) => n + 1);
  }

  function ensureAudio() {
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
  }

  function beep(freq: number, duration: number, type: OscillatorType = "sine", delay = 0) {
    if (!soundOn) return;
    ensureAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  }

  function playSound(kind: "move" | "capture" | "check" | "end") {
    if (kind === "move") beep(420, 0.09, "triangle");
    else if (kind === "capture") beep(200, 0.14, "square");
    else if (kind === "check") beep(700, 0.12, "sawtooth");
    else {
      beep(500, 0.12, "triangle", 0);
      beep(340, 0.16, "triangle", 0.13);
      beep(240, 0.22, "triangle", 0.26);
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem(`qahwa-chess-${code}`);
    if (saved) setPlayerNumber(JSON.parse(saved).playerNumber);

    async function load() {
      const { data } = await supabase.from("duo_chess_games").select("*").eq("code", code).single();
      if (data) {
        game.load(data.fen);
        setStatus(data.status);
        setGameId(data.id);
        rerender();
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (!gameId) return;
    const channel = supabase
      .channel(`duo_chess_${gameId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "duo_chess_games", filter: `id=eq.${gameId}` },
        (payload: any) => {
          const before = game.fen();
          game.load(payload.new.fen);
          setStatus(payload.new.status);
          setSelected(null);
          setLegalTargets([]);
          if (before !== payload.new.fen) {
            if (payload.new.status === "finished") playSound("end");
            else if (game.inCheck()) playSound("check");
            else playSound("move");
          }
          rerender();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const pushState = useCallback(
    (newStatus: string, winner: string | null) => {
      if (!gameId) return;
      supabase
        .from("duo_chess_games")
        .update({
          fen: game.fen(),
          turn: game.turn(),
          status: newStatus,
          winner,
          updated_at: new Date().toISOString(),
        })
        .eq("id", gameId)
        .then();
    },
    [gameId, game, supabase]
  );

  function applyMove(moveInput: { from: string; to: string; promotion?: string }) {
    let result;
    try {
      result = game.move(moveInput);
    } catch {
      return;
    }
    if (!result) return;

    setLastMove({ from: result.from, to: result.to });

    let newStatus = status;
    let winner: string | null = null;
    if (game.isCheckmate()) {
      newStatus = "finished";
      winner = role;
      playSound("end");
    } else if (game.isDraw()) {
      newStatus = "finished";
      winner = "draw";
      playSound("end");
    } else if (game.inCheck()) {
      playSound("check");
    } else if (result.captured) {
      playSound("capture");
    } else {
      playSound("move");
    }

    setStatus(newStatus as typeof status);
    rerender();
    pushState(newStatus, winner);
  }

  function onSquareClick(square: string) {
    if (status !== "playing") return;
    if (role === "spectator") return;
    if (game.isGameOver()) return;
    if (game.turn() !== role) return;

    if (selected) {
      if (legalTargets.includes(square)) {
        ensureAudio();
        applyMove({ from: selected, to: square, promotion: "q" });
        setSelected(null);
        setLegalTargets([]);
        return;
      }
      setSelected(null);
      setLegalTargets([]);
    }

    const piece = game.get(square as any);
    if (piece && piece.color === game.turn()) {
      setSelected(square);
      const moves = game.moves({ square, verbose: true } as any) as unknown as { to: string }[];
      setLegalTargets(moves.map((m) => m.to));
    } else {
      rerender();
    }
  }

  const board = game.board();

  let statusText = "";
  let statusClass = "text-qahwa-blanc";
  if (status === "waiting") {
    statusText = `En attente d'un adversaire… code ${code}`;
  } else if (game.isCheckmate()) {
    const winner = game.turn() === "w" ? "Noirs" : "Blancs";
    statusText = `Echec et mat - les ${winner} gagnent !`;
    statusClass = "text-qahwa-orange";
  } else if (game.isDraw()) {
    statusText = "Partie nulle";
    statusClass = "text-qahwa-orange";
  } else if (game.inCheck()) {
    statusText = `Echec - tour des ${game.turn() === "w" ? "Blancs" : "Noirs"}`;
    statusClass = "text-red-400";
  } else if (role === "spectator") {
    statusText = `Tour des ${game.turn() === "w" ? "Blancs" : "Noirs"}`;
  } else {
    statusText = game.turn() === role ? "A toi de jouer" : "Tour de l'adversaire";
  }

  const history = game.history();
  const displayBoard = role === "b" ? [...board].reverse().map((row) => [...row].reverse()) : board;

  return (
    <div className="min-h-screen bg-qahwa-noir px-4 py-6">
      <div className="mx-auto flex max-w-md items-center justify-between">
        <Link href="/play/duo" className="font-display text-xs uppercase text-qahwa-blanc/60 hover:text-qahwa-orange">
          &lsaquo; Retour
        </Link>
        <span className="font-display text-xs uppercase tracking-[0.2em] text-qahwa-orange">
          Echecs — {code}
        </span>
      </div>

      <div className="mx-auto mt-6 max-w-md text-center">
        <p className={`mt-3 font-display text-sm ${statusClass}`}>{statusText}</p>

        <div
          className="mx-auto mt-3 grid aspect-square w-full max-w-[352px] grid-cols-8 grid-rows-8 overflow-hidden rounded-lg border-4 border-[#FF6B00]/50 bg-[#B58863] shadow-[0_12px_36px_rgba(0,0,0,0.45)]"
          style={{
            colorScheme: "light",
            WebkitAppearance: "none",
            appearance: "none",
          }}
          aria-label="Échiquier"
        >
          {displayBoard.map((row, rIdx) =>
            row.map((sq, cIdx) => {
              const realRow = role === "b" ? 7 - rIdx : rIdx;
              const realCol = role === "b" ? 7 - cIdx : cIdx;
              const file = FILES[realCol] ?? "a";
              const name = file + (8 - realRow);
              const isLight = (realRow + realCol) % 2 === 0;
              const isSelected = selected === name;
              const isTarget = legalTargets.includes(name);
              const isLast =
                lastMove !== null &&
                (name === lastMove.from || name === lastMove.to);

              return (
                <button
                  key={name}
                  type="button"
                  aria-label={`Case ${name}`}
                  aria-pressed={isSelected}
                  onClick={() => onSquareClick(name)}
                  style={{
                    backgroundColor: isLight ? "#3A1B08" : "#171717",
                    colorScheme: "light",
                    WebkitAppearance: "none",
                    appearance: "none",
                    forcedColorAdjust: "none",
                  }}
                  className={`relative flex h-full min-h-0 w-full min-w-0 items-center justify-center overflow-hidden border-0 p-0 text-2xl sm:text-3xl ${
                    isSelected
                      ? "z-10 outline outline-[3px] outline-[#FF6B00] -outline-offset-[3px]"
                      : ""
                  }`}
                >
                  {isLast && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-[#FF6B00]/25"
                    />
                  )}

                  {sq && (
                    <span
                      className="relative z-[1] leading-none"
                      style={{
                        fontFamily:
                          "'Segoe UI Symbol', 'Arial Unicode MS', 'DejaVu Sans', sans-serif",
                        color: sq.color === "w" ? "#FFFFFF" : "#FF6B00",
                        textShadow: "0 1px 2px rgba(0,0,0,0.95)",
                      }}
                    >
                      {PIECE_SYMBOLS[sq.type]}
                    </span>
                  )}

                  {isTarget && !sq && (
                    <span className="pointer-events-none absolute z-[2] h-2.5 w-2.5 rounded-full bg-[#FF6B00] shadow-[0_0_0_3px_rgba(255,255,255,0.65)]" />
                  )}

                  {isTarget && sq && (
                    <span className="pointer-events-none absolute inset-0 z-[2] outline outline-[3px] outline-[#FF6B00] -outline-offset-[3px]" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <p className="mt-3 text-xs text-qahwa-blanc/50">
          Tu joues : {role === "w" ? "Blancs" : role === "b" ? "Noirs" : "Spectateur"}
        </p>

        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setSoundOn((s) => !s)}
            className="rounded-lg border border-qahwa-blanc/20 bg-white/5 px-4 py-2 font-display text-xs uppercase text-qahwa-blanc"
          >
            Son : {soundOn ? "On" : "Off"}
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-qahwa-blanc/15 bg-white/5 text-left">
          <h2 className="border-b border-qahwa-blanc/10 px-4 py-2 font-display text-[11px] uppercase text-qahwa-blanc/50">
            Historique des coups
          </h2>
          <div className="max-h-32 overflow-y-auto px-4 py-2 text-sm">
            {history.length === 0 ? (
              <p className="py-2 text-qahwa-blanc/40">Aucun coup joue pour le moment.</p>
            ) : (
              Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => (
                <div key={i} className="grid grid-cols-[24px_1fr_1fr] gap-2 py-1 text-qahwa-blanc/60">
                  <span className="font-bold">{i + 1}.</span>
                  <span className="text-qahwa-blanc">{history[i * 2] ?? ""}</span>
                  <span className="text-qahwa-blanc">{history[i * 2 + 1] ?? ""}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
