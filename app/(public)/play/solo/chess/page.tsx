"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";

type Difficulty = 1 | 2 | 3;

const PIECE_SYMBOLS: Record<string, string> = {
  p: "\u265F",
  r: "\u265C",
  n: "\u265E",
  b: "\u265D",
  q: "\u265B",
  k: "\u265A",
};
const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};
const FILES = "abcdefgh";

export default function PlaySoloChessPage() {
  const gameRef = useRef(new Chess());
  const [, setTick] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(1);
  const [baseMinutes, setBaseMinutes] = useState(5);
  const [whiteTime, setWhiteTime] = useState(300);
  const [blackTime, setBlackTime] = useState(300);
  const [soundOn, setSoundOn] = useState(true);
  const [thinking, setThinking] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const game = gameRef.current;

  function rerender() {
    setTick((n) => n + 1);
  }

  function ensureAudio() {
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
  }

  function beep(
    freq: number,
    duration: number,
    type: OscillatorType = "sine",
    delay = 0
  ) {
    if (!soundOn) return;
    ensureAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + delay + duration
    );
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

  function stopClock() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startClock() {
    stopClock();
    if (baseMinutes === 0) return;
    intervalRef.current = setInterval(() => {
      if (game.isGameOver()) {
        stopClock();
        return;
      }
      if (game.turn() === "w") setWhiteTime((t) => t - 1);
      else setBlackTime((t) => t - 1);
    }, 1000);
  }

  useEffect(() => {
    if (baseMinutes > 0 && (whiteTime <= 0 || blackTime <= 0)) {
      stopClock();
      playSound("end");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whiteTime, blackTime]);

  function resetGame() {
    game.reset();
    setSelected(null);
    setLegalTargets([]);
    setLastMove(null);
    stopClock();
    setWhiteTime(baseMinutes * 60);
    setBlackTime(baseMinutes * 60);
    rerender();
  }

  useEffect(() => {
    resetGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseMinutes]);

  function evaluateBoard() {
    let score = 0;
    game.board().forEach((row) =>
      row.forEach((sq) => {
        if (sq) {
          const val = PIECE_VALUES[sq.type] ?? 0;
          score += sq.color === "w" ? val : -val;
        }
      })
    );
    return score;
  }

  function minimax(
    depth: number,
    isMaximizing: boolean,
    alpha: number,
    beta: number
  ): number {
    if (depth === 0 || game.isGameOver()) return evaluateBoard();
    const moves = game.moves();
    if (isMaximizing) {
      let best = -Infinity;
      for (const m of moves) {
        game.move(m);
        best = Math.max(best, minimax(depth - 1, false, alpha, beta));
        game.undo();
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    }
    let best = Infinity;
    for (const m of moves) {
      game.move(m);
      best = Math.min(best, minimax(depth - 1, true, alpha, beta));
      game.undo();
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  function makeAiMove() {
    const moves = game.moves();
    if (moves.length === 0) return;
    let candidates: string[] = [];
    let bestScore = Infinity;
    for (const m of moves) {
      game.move(m);
      const score = minimax(difficulty, true, -Infinity, Infinity);
      game.undo();
      if (score < bestScore) {
        bestScore = score;
        candidates = [m];
      } else if (score === bestScore) {
        candidates.push(m);
      }
    }
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    if (!chosen) return;
    applyMove(chosen);
  }

  function applyMove(
    moveInput: string | { from: string; to: string; promotion?: string }
  ) {
    let result;
    try {
      result = game.move(moveInput);
    } catch {
      return;
    }
    if (!result) return;
    setLastMove({ from: result.from, to: result.to });
    if (intervalRef.current === null && baseMinutes > 0 && !game.isGameOver()) {
      startClock();
    }
    if (game.isCheckmate() || game.isDraw()) playSound("end");
    else if (game.inCheck()) playSound("check");
    else if (result.captured) playSound("capture");
    else playSound("move");
    rerender();

    if (!game.isGameOver() && game.turn() === "b") {
      setThinking(true);
      setTimeout(() => {
        makeAiMove();
        setThinking(false);
      }, 400);
    }
  }

  function onSquareClick(square: string) {
    if (game.isGameOver()) return;
    if (game.turn() === "b") return;

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

    const piece = game.get(square as never);
    if (piece && piece.color === game.turn()) {
      setSelected(square);
      const moves = game.moves({ square, verbose: true } as never) as unknown as {
        to: string;
      }[];
      setLegalTargets(moves.map((m) => m.to));
    } else {
      rerender();
    }
  }

  function undo() {
    game.undo();
    if (game.turn() === "b") game.undo();
    setSelected(null);
    setLegalTargets([]);
    setLastMove(null);
    rerender();
  }

  function formatTime(sec: number) {
    const s = Math.max(0, Math.ceil(sec));
    const m = Math.floor(s / 60);
    const rest = s % 60;
    return `${m}:${String(rest).padStart(2, "0")}`;
  }

  const board = game.board();

  let statusText = "";
  let statusClass = "text-qahwa-blanc";
  if (game.isCheckmate()) {
    const winner = game.turn() === "w" ? "Noirs" : "Blancs";
    statusText = `Echec et mat - les ${winner} gagnent !`;
    statusClass = "text-qahwa-orange";
  } else if (game.isDraw()) {
    statusText = "Partie nulle";
    statusClass = "text-qahwa-orange";
  } else if (thinking) {
    statusText = "L'ordinateur reflechit...";
  } else if (game.inCheck()) {
    statusText = `Echec - tour des ${game.turn() === "w" ? "Blancs" : "Noirs"}`;
    statusClass = "text-red-400";
  } else {
    statusText = `Tour des ${game.turn() === "w" ? "Blancs" : "Noirs"}`;
  }

  const history = game.history();

  return (
    <div className="min-h-screen bg-qahwa-noir px-4 py-6">
      <div className="mx-auto flex max-w-md items-center justify-between">
        <Link
          href="/play/solo"
          className="font-display text-xs uppercase text-qahwa-blanc/60 hover:text-qahwa-orange"
        >
          &lsaquo; Retour
        </Link>
        <span className="font-display text-xs uppercase tracking-[0.2em] text-qahwa-orange">
          Echecs
        </span>
      </div>

      <div className="mx-auto mt-6 max-w-md text-center">
        <div className="flex justify-center gap-2">
          {([1, 2, 3] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`rounded-full border px-3 py-1.5 text-xs font-display uppercase ${
                difficulty === d
                  ? "border-qahwa-orange bg-qahwa-orange text-qahwa-noir"
                  : "border-qahwa-blanc/20 text-qahwa-blanc/60"
              }`}
            >
              {d === 1 ? "Facile" : d === 2 ? "Moyen" : "Difficile"}
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-center gap-2">
          {[0, 5, 10].map((t) => (
            <button
              key={t}
              onClick={() => setBaseMinutes(t)}
              className={`rounded-full border px-3 py-1.5 text-xs font-display uppercase ${
                baseMinutes === t
                  ? "border-qahwa-orange bg-qahwa-orange text-qahwa-noir"
                  : "border-qahwa-blanc/20 text-qahwa-blanc/60"
              }`}
            >
              {t === 0 ? "Sans minuteur" : `${t} min`}
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-between">
          <div
            className={`rounded-lg border px-4 py-2 font-display ${
              game.turn() === "b" && !game.isGameOver()
                ? "border-qahwa-orange bg-qahwa-orange text-qahwa-noir"
                : "border-qahwa-blanc/15 text-qahwa-blanc/60"
            }`}
          >
            <span className="block text-[10px] uppercase opacity-75">
              Noirs
            </span>
            {baseMinutes === 0 ? "..." : formatTime(blackTime)}
          </div>
          <div
            className={`rounded-lg border px-4 py-2 font-display ${
              game.turn() === "w" && !game.isGameOver()
                ? "border-qahwa-orange bg-qahwa-orange text-qahwa-noir"
                : "border-qahwa-blanc/15 text-qahwa-blanc/60"
            }`}
          >
            <span className="block text-[10px] uppercase opacity-75">
              Blancs
            </span>
            {baseMinutes === 0 ? "..." : formatTime(whiteTime)}
          </div>
        </div>

        <p className={`mt-3 font-display text-sm ${statusClass}`}>
          {statusText}
        </p>

        <div className="mx-auto mt-3 grid aspect-square w-full max-w-[352px] grid-cols-8 grid-rows-8 overflow-hidden rounded-lg border-4 border-black shadow-2xl">
          {board.map((row, rIdx) =>
            row.map((sq, cIdx) => {
              const file = FILES[cIdx] ?? "a";
              const name = file + (8 - rIdx);
              const isLight = (rIdx + cIdx) % 2 === 0;
              const isSelected = selected === name;
              const isTarget = legalTargets.includes(name);
              const isLast =
                lastMove && (name === lastMove.from || name === lastMove.to);
              return (
                <button
                  key={name}
                  onClick={() => onSquareClick(name)}
                  className={`relative flex items-center justify-center text-2xl sm:text-3xl ${
                    isLight ? "bg-[#2E2925]" : "bg-[#151210]"
                  } ${
                    isSelected
                      ? "outline outline-[3px] outline-qahwa-orange -outline-offset-[3px]"
                      : ""
                  } ${isLast ? "bg-qahwa-orange/10" : ""}`}
                >
                  {sq && (
                    <span
                      className={
                        sq.color === "w"
                          ? "text-[#FDFBF8] drop-shadow"
                          : "text-qahwa-orange drop-shadow"
                      }
                    >
                      {PIECE_SYMBOLS[sq.type]}
                    </span>
                  )}
                  {isTarget && !sq && (
                    <span className="absolute h-2.5 w-2.5 rounded-full bg-qahwa-orange/70" />
                  )}
                  {isTarget && sq && (
                    <span className="absolute inset-0 outline outline-[3px] outline-qahwa-orange/70 -outline-offset-[3px]" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={undo}
            className="rounded-lg border border-qahwa-blanc/20 bg-white/5 px-4 py-2 font-display text-xs uppercase text-qahwa-blanc"
          >
            Annuler
          </button>
          <button
            onClick={() => setSoundOn((s) => !s)}
            className="rounded-lg border border-qahwa-blanc/20 bg-white/5 px-4 py-2 font-display text-xs uppercase text-qahwa-blanc"
          >
            Son : {soundOn ? "On" : "Off"}
          </button>
          <button
            onClick={resetGame}
            className="rounded-lg border border-qahwa-orange bg-qahwa-orange px-4 py-2 font-display text-xs uppercase text-qahwa-noir"
          >
            Nouvelle partie
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-qahwa-blanc/15 bg-white/5 text-left">
          <h2 className="border-b border-qahwa-blanc/10 px-4 py-2 font-display text-[11px] uppercase text-qahwa-blanc/50">
            Historique des coups
          </h2>
          <div className="max-h-32 overflow-y-auto px-4 py-2 text-sm">
            {history.length === 0 ? (
              <p className="py-2 text-qahwa-blanc/40">
                Aucun coup joue pour le moment.
              </p>
            ) : (
              Array.from({ length: Math.ceil(history.length / 2) }).map(
                (_, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[24px_1fr_1fr] gap-2 py-1 text-qahwa-blanc/60"
                  >
                    <span className="font-bold">{i + 1}.</span>
                    <span className="text-qahwa-blanc">
                      {history[i * 2] ?? ""}
                    </span>
                    <span className="text-qahwa-blanc">
                      {history[i * 2 + 1] ?? ""}
                    </span>
                  </div>
                )
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}