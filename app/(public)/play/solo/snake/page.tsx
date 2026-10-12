
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

const GRID_SIZE = 20;
const CELL_SIZE = 18;
const BOARD_SIZE = GRID_SIZE * CELL_SIZE;

type Point = { x: number; y: number };
type Direction = "up" | "down" | "left" | "right";

const INITIAL_SNAKE: Point[] = [
  { x: 8, y: 10 },
  { x: 7, y: 10 },
  { x: 6, y: 10 },
];

function randomFood(snake: Point[]): Point {
  const freeCells: Point[] = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!snake.some((part) => part.x === x && part.y === y)) {
        freeCells.push({ x, y });
      }
    }
  }

  return freeCells[Math.floor(Math.random() * freeCells.length)] ?? {
    x: 0,
    y: 0,
  };
}

export default function SnakePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snakeRef = useRef<Point[]>(INITIAL_SNAKE.map((p) => ({ ...p })));
  const dirRef = useRef<Direction>("right");
  const nextDirRef = useRef<Direction>("right");
  const foodRef = useRef<Point>(randomFood(INITIAL_SNAKE));
  const scoreRef = useRef(0);
  const lastTurnRef = useRef<Direction>("right");

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  useEffect(() => {
    try {
      const saved = Number(
        window.localStorage.getItem("qahwa-snake-best") ?? 0
      );
      if (Number.isFinite(saved) && saved >= 0) setBest(saved);
    } catch {
      // Le jeu reste utilisable si le stockage est indisponible.
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);
    ctx.fillStyle = "#101010";
    ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

    ctx.strokeStyle = "rgba(255,255,255,0.045)";
    ctx.lineWidth = 0.5;

    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * CELL_SIZE;

      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, BOARD_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(BOARD_SIZE, pos);
      ctx.stroke();
    }

    const food = foodRef.current;
    const foodX = food.x * CELL_SIZE + CELL_SIZE / 2;
    const foodY = food.y * CELL_SIZE + CELL_SIZE / 2;

    ctx.save();
    ctx.shadowColor = "#FF6B00";
    ctx.shadowBlur = 13;
    ctx.fillStyle = "#FF6B00";
    ctx.beginPath();
    ctx.arc(foodX, foodY, CELL_SIZE * 0.29, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const snake = snakeRef.current;

    snake.forEach((part, index) => {
      const inset = index === 0 ? 1.5 : 2.2;
      const x = part.x * CELL_SIZE + inset;
      const y = part.y * CELL_SIZE + inset;
      const size = CELL_SIZE - inset * 2;

      ctx.save();
      ctx.fillStyle =
        index === 0
          ? "#FF8A32"
          : `rgba(255,107,0,${Math.max(0.4, 0.95 - index * 0.025)})`;

      ctx.shadowColor =
        index === 0 ? "rgba(255,107,0,0.45)" : "transparent";
      ctx.shadowBlur = index === 0 ? 9 : 0;
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, index === 0 ? 5 : 4);
      ctx.fill();
      ctx.restore();
    });

    const head = snake[0];

    if (head) {
      const cx = head.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = head.y * CELL_SIZE + CELL_SIZE / 2;
      let eyes: { x: number; y: number }[] = [];

      if (dirRef.current === "right") {
        eyes = [{ x: 4, y: -3 }, { x: 4, y: 3 }];
      } else if (dirRef.current === "left") {
        eyes = [{ x: -4, y: -3 }, { x: -4, y: 3 }];
      } else if (dirRef.current === "up") {
        eyes = [{ x: -3, y: -4 }, { x: 3, y: -4 }];
      } else {
        eyes = [{ x: -3, y: 4 }, { x: 3, y: 4 }];
      }

      ctx.fillStyle = "#151515";
      eyes.forEach((eye) => {
        ctx.beginPath();
        ctx.arc(cx + eye.x, cy + eye.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, []);

  const resetGame = useCallback(() => {
    const freshSnake = INITIAL_SNAKE.map((p) => ({ ...p }));

    snakeRef.current = freshSnake;
    dirRef.current = "right";
    nextDirRef.current = "right";
    lastTurnRef.current = "right";
    scoreRef.current = 0;
    foodRef.current = randomFood(freshSnake);

    setScore(0);
    setGameOver(false);
    setWon(false);
    setPaused(false);
    setRunning(true);
  }, []);

  const changeDirection = useCallback((dir: Direction) => {
    const opposite: Record<Direction, Direction> = {
      up: "down",
      down: "up",
      left: "right",
      right: "left",
    };

    if (dir === opposite[dirRef.current]) return;
    if (dir === opposite[lastTurnRef.current]) return;

    nextDirRef.current = dir;
  }, []);

  const togglePause = useCallback(() => {
    if (!running || gameOver || won) return;
    setPaused((value) => !value);
  }, [running, gameOver, won]);

  useEffect(() => {
    if (!running || paused || gameOver || won) return;

    const tick = () => {
      dirRef.current = nextDirRef.current;
      lastTurnRef.current = dirRef.current;

      const currentHead = snakeRef.current[0];
      if (!currentHead) return;

      const head: Point = { ...currentHead };

      if (dirRef.current === "up") head.y--;
      if (dirRef.current === "down") head.y++;
      if (dirRef.current === "left") head.x--;
      if (dirRef.current === "right") head.x++;

      const hitWall =
        head.x < 0 ||
        head.y < 0 ||
        head.x >= GRID_SIZE ||
        head.y >= GRID_SIZE;

      const eating =
        head.x === foodRef.current.x && head.y === foodRef.current.y;

      const bodyToCheck = eating
        ? snakeRef.current
        : snakeRef.current.slice(0, -1);

      const hitSelf = bodyToCheck.some(
        (part) => part.x === head.x && part.y === head.y
      );

      if (hitWall || hitSelf) {
        setGameOver(true);
        setRunning(false);

        const finalScore = scoreRef.current;

        setBest((previous) => {
          const nextBest = Math.max(previous, finalScore);

          try {
            window.localStorage.setItem(
              "qahwa-snake-best",
              String(nextBest)
            );
          } catch {
            // Le record de la session reste affiché.
          }

          return nextBest;
        });

        return;
      }

      const newSnake = [head, ...snakeRef.current];

      if (eating) {
        scoreRef.current += 1;
        setScore(scoreRef.current);

        if (newSnake.length === GRID_SIZE * GRID_SIZE) {
          snakeRef.current = newSnake;
          setWon(true);
          setRunning(false);

          setBest((previous) => {
            const nextBest = Math.max(previous, scoreRef.current);

            try {
              window.localStorage.setItem(
                "qahwa-snake-best",
                String(nextBest)
              );
            } catch {
              // Le jeu reste jouable.
            }

            return nextBest;
          });

          return;
        }

        foodRef.current = randomFood(newSnake);
      } else {
        newSnake.pop();
      }

      snakeRef.current = newSnake;
      draw();
    };

    const speed = Math.max(65, 135 - scoreRef.current * 3);
    const interval = window.setInterval(tick, speed);

    return () => window.clearInterval(interval);
  }, [running, paused, gameOver, won, draw]);

  useEffect(() => {
    draw();
  }, [draw, score, running, paused, gameOver, won]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const key = event.key.toLowerCase();

      const directions: Record<string, Direction> = {
        arrowup: "up",
        w: "up",
        z: "up",
        arrowdown: "down",
        s: "down",
        arrowleft: "left",
        a: "left",
        q: "left",
        arrowright: "right",
        d: "right",
      };

      const direction = directions[key];

      if (direction) {
        event.preventDefault();
        changeDirection(direction);
      } else if (key === " " || key === "escape") {
        event.preventDefault();
        togglePause();
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [changeDirection, togglePause]);

  const directionButton = (
    direction: Direction,
    label: string,
    symbol: string
  ) => (
    <button
      key={direction}
      type="button"
      aria-label={label}
      onClick={() => changeDirection(direction)}
      className="flex h-14 w-14 touch-none select-none items-center justify-center rounded-2xl border-2 border-qahwa-orange/30 bg-[#1b1b1b] text-2xl font-bold text-qahwa-orange shadow-[0_4px_0_rgba(255,107,0,0.12)] transition active:translate-y-1 active:border-qahwa-orange active:bg-qahwa-orange active:text-qahwa-noir active:shadow-none sm:h-12 sm:w-12"
    >
      {symbol}
    </button>
  );

  return (
    <main className="fixed inset-0 overflow-y-auto overscroll-none bg-qahwa-noir px-4 py-5 text-qahwa-blanc sm:px-6 sm:py-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <Link
            href="/play/solo"
            className="text-xs font-semibold uppercase tracking-wider text-white/50 transition hover:text-qahwa-orange"
          >
            ← Retour
          </Link>

          <span className="rounded-full border border-qahwa-orange/25 bg-qahwa-orange/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-qahwa-orange">
            Qahwa Play
          </span>
        </div>

        <header className="mt-5 text-center sm:mt-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-qahwa-orange">
            Réflexes · Précision · Vitesse
          </p>

          <h1 className="mt-2 font-display text-4xl uppercase sm:text-5xl">
            SNA<span className="text-qahwa-orange">KE</span>
          </h1>

          <p className="mt-2 text-sm text-white/45">
            Mange, grandis et bats ton record.
          </p>
        </header>

        <section
          aria-label="Statistiques de la partie"
          className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-3"
        >
          <div className="rounded-2xl border border-white/[0.08] bg-[#151515] px-4 py-3 text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
              Score
            </p>
            <p className="mt-1 font-display text-2xl tabular-nums">
              {String(score).padStart(2, "0")}
            </p>
          </div>

          <div className="rounded-2xl border border-qahwa-orange/20 bg-qahwa-orange/[0.06] px-4 py-3 text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-qahwa-orange/70">
              Meilleur score
            </p>
            <p className="mt-1 font-display text-2xl tabular-nums text-qahwa-orange">
              {String(best).padStart(2, "0")}
            </p>
          </div>
        </section>

        <div className="mx-auto mt-4 w-full max-w-[390px] rounded-[22px] border border-qahwa-orange/40 bg-[#0c0c0c] p-2 shadow-[0_0_35px_rgba(255,107,0,0.08)] sm:p-3">
          <div className="relative overflow-hidden rounded-xl">
            <canvas
              ref={canvasRef}
              width={BOARD_SIZE}
              height={BOARD_SIZE}
              className="block h-auto w-full"
              aria-label="Plateau du jeu Snake"
            />

            {(!running || paused) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-5 text-center backdrop-blur-[2px]">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-qahwa-orange/30 bg-qahwa-orange/10 text-2xl text-qahwa-orange">
                  {won ? "★" : gameOver ? "↻" : paused ? "Ⅱ" : "▶"}
                </div>

                <h2 className="font-display text-2xl uppercase">
                  {won
                    ? "Parfait !"
                    : gameOver
                      ? "Game over"
                      : paused
                        ? "Pause"
                        : "Prêt à jouer ?"}
                </h2>

                <p className="mt-2 max-w-xs text-xs leading-5 text-white/55">
                  {won
                    ? "Tu as rempli tout le plateau. Impressionnant !"
                    : gameOver
                      ? `Ton score : ${score}. Une nouvelle partie ?`
                      : paused
                        ? "Reprends la partie quand tu es prêt."
                        : "Attrape les points orange et évite les murs."}
                </p>

                <button
                  type="button"
                  onClick={
                    paused && !gameOver && !won
                      ? togglePause
                      : resetGame
                  }
                  className="mt-5 rounded-full bg-qahwa-orange px-7 py-3 text-xs font-black uppercase tracking-wider text-qahwa-noir transition hover:bg-[#ff8129] active:scale-95"
                >
                  {paused && !gameOver && !won
                    ? "Reprendre"
                    : gameOver || won
                      ? "Rejouer"
                      : "Jouer"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto mt-4 flex max-w-[390px] items-center justify-between gap-3">
          <p className="text-[11px] leading-5 text-white/40">
            {running && !paused
              ? "Reste concentré !"
              : "Prêt pour un nouveau record ?"}
          </p>

          {running && !gameOver && !won && (
            <button
              type="button"
              onClick={togglePause}
              className="shrink-0 rounded-full border border-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white/70 transition hover:border-qahwa-orange hover:text-qahwa-orange"
            >
              {paused ? "▶ Reprendre" : "Ⅱ Pause"}
            </button>
          )}
        </div>

        {/* Pavé directionnel : haut centré, gauche/bas/droite sur la rangée inférieure */}
        <div className="mx-auto mt-4 grid w-fit grid-cols-3 gap-2.5 touch-none">
          <div aria-hidden="true" />
          {directionButton("up", "Haut", "↑")}
          <div aria-hidden="true" />

          {directionButton("left", "Gauche", "←")}
          {directionButton("down", "Bas", "↓")}
          {directionButton("right", "Droite", "→")}
        </div>

        <div className="mt-3 text-center text-[10px] leading-5 text-white/35">
          <p>Flèches du clavier ou ZQSD</p>
          <p>Espace pour mettre en pause</p>
        </div>

        <footer className="mt-5 pb-3 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/20">
            Une pause. Une partie. Qahwa.
          </p>
        </footer>
      </div>
    </main>
  );
}
