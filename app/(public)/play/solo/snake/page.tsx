
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

const GRID_SIZE = 18;
const CELL_SIZE = 20;
const INITIAL_SNAKE = [
  { x: 8, y: 9 },
  { x: 7, y: 9 },
  { x: 6, y: 9 },
];

type Point = { x: number; y: number };
type Direction = "up" | "down" | "left" | "right";

function randomFood(snake: Point[]): Point {
  let food: Point;
  do {
    food = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some((s) => s.x === food.x && s.y === food.y));
  return food;
}

export default function SnakePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snakeRef = useRef<Point[]>(INITIAL_SNAKE);
  const dirRef = useRef<Direction>("right");
  const nextDirRef = useRef<Direction>("right");
  const foodRef = useRef<Point>(randomFood(INITIAL_SNAKE));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [running, setRunning] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#f97316";
    snakeRef.current.forEach((seg, i) => {
      ctx.globalAlpha = i === 0 ? 1 : 0.75;
      ctx.fillRect(
        seg.x * CELL_SIZE + 1,
        seg.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      );
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(
      foodRef.current.x * CELL_SIZE + CELL_SIZE / 2,
      foodRef.current.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2.6,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }, []);

  const resetGame = useCallback(() => {
    snakeRef.current = INITIAL_SNAKE.map((p) => ({ ...p }));
    dirRef.current = "right";
    nextDirRef.current = "right";
    foodRef.current = randomFood(snakeRef.current);
    setScore(0);
    setGameOver(false);
    setRunning(true);
    draw();
  }, [draw]);

  useEffect(() => {
    if (!running || gameOver) return;

       const interval = setInterval(() => {
      dirRef.current = nextDirRef.current;
      const currentHead = snakeRef.current[0];
      if (!currentHead) return;
      const head: Point = { x: currentHead.x, y: currentHead.y };

      if (dirRef.current === "up") head.y -= 1;
      if (dirRef.current === "down") head.y += 1;
      if (dirRef.current === "left") head.x -= 1;
      if (dirRef.current === "right") head.x += 1;

      const hitWall =
        head.x < 0 || head.y < 0 || head.x >= GRID_SIZE || head.y >= GRID_SIZE;
      const hitSelf = snakeRef.current.some(
        (s) => s.x === head.x && s.y === head.y
      );

      if (hitWall || hitSelf) {
        setGameOver(true);
        setRunning(false);
        setBest((b) => Math.max(b, score));
        return;
      }

      const newSnake = [head, ...snakeRef.current];

      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        setScore((s) => s + 1);
        foodRef.current = randomFood(newSnake);
      } else {
        newSnake.pop();
      }

      snakeRef.current = newSnake;
      draw();
    }, 130);

    return () => clearInterval(interval);
  }, [running, gameOver, draw, score]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowUp" && dirRef.current !== "down")
        nextDirRef.current = "up";
      if (e.key === "ArrowDown" && dirRef.current !== "up")
        nextDirRef.current = "down";
      if (e.key === "ArrowLeft" && dirRef.current !== "right")
        nextDirRef.current = "left";
      if (e.key === "ArrowRight" && dirRef.current !== "left")
        nextDirRef.current = "right";
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    draw();
  }, [draw]);

  function press(dir: Direction) {
    const opposite: Record<Direction, Direction> = {
      up: "down",
      down: "up",
      left: "right",
      right: "left",
    };
    if (dirRef.current !== opposite[dir]) {
      nextDirRef.current = dir;
    }
  }

  return (
    <section className="min-h-screen bg-qahwa-noir px-5 py-10 text-center">
      <Link
        href="/play/solo"
        className="font-display text-xs uppercase text-qahwa-blanc/60 hover:text-qahwa-orange"
      >
        &lsaquo; Retour
      </Link>
      <p className="mt-4 font-display text-xs uppercase tracking-[0.3em] text-qahwa-orange">
        Qahwa Play
      </p>
      <h1 className="font-display text-3xl uppercase text-qahwa-blanc">
        Snake
      </h1>

      <div className="mt-4 flex justify-center gap-6 text-sm text-qahwa-blanc/70">
        <span>Score : {score}</span>
        <span>Meilleur : {best}</span>
      </div>

      <div className="relative mx-auto mt-6 w-fit">
        <canvas
          ref={canvasRef}
          width={GRID_SIZE * CELL_SIZE}
          height={GRID_SIZE * CELL_SIZE}
          className="rounded-xl border-2 border-qahwa-blanc/15 bg-qahwa-noir shadow-brutal-sm"
        />

        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/70">
            {gameOver && (
              <p className="font-display text-xl uppercase text-qahwa-blanc">
                Perdu ! Score : {score}
              </p>
            )}
            <button
              onClick={resetGame}
              className="qahwa-cta rounded-full border-2 border-qahwa-noir bg-qahwa-orange px-6 py-2.5 font-display text-sm uppercase text-qahwa-noir shadow-brutal"
            >
              {gameOver ? "Rejouer" : "Jouer"}
            </button>
          </div>
        )}
      </div>

      {running && (
        <div className="mx-auto mt-6 grid w-40 grid-cols-3 gap-2 sm:hidden">
          <div />
          <button
            onClick={() => press("up")}
            className="rounded-lg border-2 border-qahwa-blanc/20 bg-white/5 py-3 text-qahwa-blanc active:bg-white/15"
          >
            ↑
          </button>
          <div />
          <button
            onClick={() => press("left")}
            className="rounded-lg border-2 border-qahwa-blanc/20 bg-white/5 py-3 text-qahwa-blanc active:bg-white/15"
          >
            ←
          </button>
          <button
            onClick={() => press("down")}
            className="rounded-lg border-2 border-qahwa-blanc/20 bg-white/5 py-3 text-qahwa-blanc active:bg-white/15"
          >
            ↓
          </button>
          <button
            onClick={() => press("right")}
            className="rounded-lg border-2 border-qahwa-blanc/20 bg-white/5 py-3 text-qahwa-blanc active:bg-white/15"
          >
            →
          </button>
        </div>
      )}

      <p className="mt-4 hidden text-xs text-qahwa-blanc/40 sm:block">
        Utilise les fleches du clavier
      </p>
    </section>
  );
}