"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

type Tile = { id: number; value: number; row: number; col: number };

const SIZE = 4;
const GAP = 10;

const TILE_COLORS: Record<number, { bg: string; fg: string }> = {
  2: { bg: "#2E2925", fg: "#F2ECE4" },
  4: { bg: "#3A322B", fg: "#F2ECE4" },
  8: { bg: "#C24C09", fg: "#FDFBF8" },
  16: { bg: "#D8560B", fg: "#FDFBF8" },
  32: { bg: "#E85A0C", fg: "#FDFBF8" },
  64: { bg: "#F2600C", fg: "#FDFBF8" },
  128: { bg: "#FF7E2E", fg: "#181008" },
  256: { bg: "#FF9448", fg: "#181008" },
  512: { bg: "#FFAA63", fg: "#181008" },
  1024: { bg: "#FFC088", fg: "#181008" },
  2048: { bg: "#FFD9AD", fg: "#181008" },
};

export default function Play2048Page() {
  const tileLayerRef = useRef<HTMLDivElement>(null);
  const scoreValRef = useRef<HTMLSpanElement>(null);
  const bestValRef = useRef<HTMLSpanElement>(null);
  const scoreBoxRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayTextRef = useRef<HTMLDivElement>(null);
  const overlayContinueRef = useRef<HTMLButtonElement>(null);
  const soundBtnRef = useRef<HTMLButtonElement>(null);
  const gameWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let grid: (Tile | null)[][] = [];
    const tileEls = new Map<number, HTMLDivElement>();
    let score = 0;
    let best = 0;
    let tileIdCounter = 0;
    let soundOn = true;
    let wonAcknowledged = false;
    let cellSize = 0;

    const tileLayer = tileLayerRef.current!;
    const scoreVal = scoreValRef.current!;
    const bestVal = bestValRef.current!;
    const scoreBox = scoreBoxRef.current!;
    const overlay = overlayRef.current!;
    const overlayText = overlayTextRef.current!;
    const overlayContinue = overlayContinueRef.current!;

    let audioCtx: AudioContext | null = null;
    function ensureAudio() {
      if (!audioCtx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        audioCtx = new AudioCtx();
      }
    }
    function beep(
      freq: number,
      duration: number,
      type: OscillatorType = "sine",
      delay = 0,
      vol = 0.08
    ) {
      if (!soundOn) return;
      ensureAudio();
      const ctx = audioCtx!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + delay + duration
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    }
    function playSound(kind: "move" | "merge" | "win" | "over") {
      if (kind === "move") beep(320, 0.06, "triangle");
      else if (kind === "merge") beep(520, 0.09, "triangle");
      else if (kind === "win") {
        beep(500, 0.1, "triangle", 0);
        beep(660, 0.12, "triangle", 0.1);
        beep(880, 0.16, "triangle", 0.2);
      } else if (kind === "over") beep(220, 0.28, "sawtooth");
    }

    function emptyGrid(): (Tile | null)[][] {
      return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    }

    function computeCellSize() {
      const wrapSize = tileLayer.clientWidth;
      cellSize = (wrapSize - GAP * (SIZE - 1)) / SIZE;
    }

    function posFor(row: number, col: number) {
      return { left: col * (cellSize + GAP), top: row * (cellSize + GAP) };
    }

    function randomEmptyCell(): [number, number] | null {
      const cells: [number, number][] = [];
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++) if (!grid[r][c]) cells.push([r, c]);
      if (cells.length === 0) return null;
      return cells[Math.floor(Math.random() * cells.length)];
    }

    function applyTileStyle(el: HTMLDivElement, tile: Tile) {
      const colors = TILE_COLORS[tile.value] || { bg: "#FFD9AD", fg: "#181008" };
      el.style.width = cellSize + "px";
      el.style.height = cellSize + "px";
      el.style.background = colors.bg;
      el.style.color = colors.fg;
      el.style.fontSize =
        (tile.value < 100
          ? cellSize * 0.42
          : tile.value < 1000
          ? cellSize * 0.36
          : cellSize * 0.28) + "px";
      el.textContent = String(tile.value);
    }

    function createTileEl(tile: Tile) {
      const el = document.createElement("div");
      el.className = "tile new";
      applyTileStyle(el, tile);
      const pos = posFor(tile.row, tile.col);
      el.style.left = pos.left + "px";
      el.style.top = pos.top + "px";
      tileLayer.appendChild(el);
      tileEls.set(tile.id, el);
      el.addEventListener(
        "animationend",
        () => el.classList.remove("new", "merged"),
        { once: true }
      );
    }

    function addRandomTile() {
      const cell = randomEmptyCell();
      if (!cell) return;
      const [r, c] = cell;
      const value = Math.random() < 0.9 ? 2 : 4;
      const tile: Tile = { id: tileIdCounter++, value, row: r, col: c };
      grid[r][c] = tile;
      createTileEl(tile);
    }

    function clearAllTiles() {
      tileEls.forEach((el) => el.remove());
      tileEls.clear();
    }

    function updateScore(gained: number) {
      scoreVal.textContent = String(score);
      if (gained > 0) {
        scoreVal.classList.remove("bump");
        void scoreVal.offsetWidth;
        scoreVal.classList.add("bump");
        const pop = document.createElement("span");
        pop.className = "float-score";
        pop.textContent = "+" + gained;
        scoreBox.appendChild(pop);
        setTimeout(() => pop.remove(), 700);
      }
      if (score > best) {
        best = score;
        bestVal.textContent = String(best);
      }
    }

    function startGame() {
      clearAllTiles();
      grid = emptyGrid();
      score = 0;
      wonAcknowledged = false;
      computeCellSize();
      addRandomTile();
      addRandomTile();
      overlay.classList.remove("show");
      overlayContinue.style.display = "none";
      updateScore(0);
    }

    type Direction = "left" | "right" | "up" | "down";

    function extractLine(direction: Direction, index: number) {
      const cells: (Tile | null)[] = [];
      for (let i = 0; i < SIZE; i++) {
        if (direction === "left") cells.push(grid[index][i]);
        else if (direction === "right") cells.push(grid[index][SIZE - 1 - i]);
        else if (direction === "up") cells.push(grid[i][index]);
        else cells.push(grid[SIZE - 1 - i][index]);
      }
      return cells;
    }

    function writeLine(direction: Direction, index: number, line: (Tile | null)[]) {
      for (let i = 0; i < SIZE; i++) {
        let r: number, c: number;
        if (direction === "left") { r = index; c = i; }
        else if (direction === "right") { r = index; c = SIZE - 1 - i; }
        else if (direction === "up") { r = i; c = index; }
        else { r = SIZE - 1 - i; c = index; }
        grid[r][c] = line[i];
        if (line[i]) { line[i]!.row = r; line[i]!.col = c; }
      }
    }

    function findMergeTargetPos(removedTile: Tile) {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const t = grid[r][c];
          if (t && t.value === removedTile.value * 2) return posFor(r, c);
        }
      }
      return posFor(removedTile.row, removedTile.col);
    }

    function canMoveCheck() {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (!grid[r][c]) return true;
          const v = grid[r][c]!.value;
          if (c < SIZE - 1 && grid[r][c + 1] && grid[r][c + 1]!.value === v) return true;
          if (r < SIZE - 1 && grid[r + 1][c] && grid[r + 1][c]!.value === v) return true;
        }
      }
      return false;
    }

    function checkGameState() {
      if (!wonAcknowledged) {
        for (let r = 0; r < SIZE; r++) {
          for (let c = 0; c < SIZE; c++) {
            if (grid[r][c] && grid[r][c]!.value === 2048) {
              overlayText.textContent = "2048 atteint !";
              overlayContinue.style.display = "inline-block";
              overlay.classList.add("show");
              playSound("win");
              return;
            }
          }
        }
      }
      if (!canMoveCheck()) {
        overlayText.textContent = "Plus de coup possible";
        overlayContinue.style.display = "none";
        overlay.classList.add("show");
        playSound("over");
      }
    }

    function move(direction: Direction) {
      if (overlay.classList.contains("show")) return;
      let anyMoved = false;
      let gained = 0;
      const removedTiles: Tile[] = [];
      const mergedTileIds: number[] = [];

      for (let idx = 0; idx < SIZE; idx++) {
        const line = extractLine(direction, idx);
        const filtered = line.filter((t): t is Tile => t !== null);
        const result: (Tile | null)[] = [];
        let i = 0;
        while (i < filtered.length) {
          if (i + 1 < filtered.length && filtered[i].value === filtered[i + 1].value) {
            filtered[i].value *= 2;
            result.push(filtered[i]);
            removedTiles.push(filtered[i + 1]);
            mergedTileIds.push(filtered[i].id);
            gained += filtered[i].value;
            i += 2;
          } else {
            result.push(filtered[i]);
            i += 1;
          }
        }
        while (result.length < SIZE) result.push(null);

        for (let k = 0; k < SIZE; k++) {
          const before = line[k] ? line[k]!.id : null;
          const after = result[k] ? result[k]!.id : null;
          if (before !== after) anyMoved = true;
        }
        writeLine(direction, idx, result);
      }

      if (!anyMoved) return;

      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const t = grid[r][c];
          if (t) {
            const el = tileEls.get(t.id);
            if (el) {
              const pos = posFor(r, c);
              el.style.left = pos.left + "px";
              el.style.top = pos.top + "px";
              applyTileStyle(el, t);
              if (mergedTileIds.includes(t.id)) {
                setTimeout(() => {
                  el.classList.remove("merged");
                  void el.offsetWidth;
                  el.classList.add("merged");
                }, 110);
              }
            }
          }
        }
      }

      removedTiles.forEach((t) => {
        const el = tileEls.get(t.id);
        if (el) {
          const pos = findMergeTargetPos(t);
          el.style.left = pos.left + "px";
          el.style.top = pos.top + "px";
          tileEls.delete(t.id);
          setTimeout(() => el.remove(), 130);
        }
      });

      score += gained;
      updateScore(gained);
      playSound(mergedTileIds.length > 0 ? "merge" : "move");

      setTimeout(() => {
        addRandomTile();
        checkGameState();
      }, 130);
    }

    function onKeyDown(e: KeyboardEvent) {
      const map: Record<string, Direction> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };
      if (map[e.key]) {
        e.preventDefault();
        ensureAudio();
        move(map[e.key]);
      }
    }

    let touchStartX = 0;
    let touchStartY = 0;
    function onTouchStart(e: TouchEvent) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
    function onTouchEnd(e: TouchEvent) {
      ensureAudio();
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
      else move(dy > 0 ? "down" : "up");
    }

    function onResize() {
      computeCellSize();
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const t = grid[r][c];
          if (t) {
            const el = tileEls.get(t.id);
            if (el) {
              const pos = posFor(r, c);
              el.style.left = pos.left + "px";
              el.style.top = pos.top + "px";
              applyTileStyle(el, t);
            }
          }
        }
      }
    }

    const wrap = gameWrapRef.current!;
    const soundBtn = soundBtnRef.current!;
    const newGameBtn = document.getElementById("play2048-newgame")!;
    const overlayRestart = document.getElementById("play2048-restart")!;

    function onSoundClick() {
      soundOn = !soundOn;
      soundBtn.textContent = "Son : " + (soundOn ? "On" : "Off");
      if (soundOn) ensureAudio();
    }
    function onNewGame() {
      startGame();
    }
    function onOverlayContinue() {
      wonAcknowledged = true;
      overlay.classList.remove("show");
    }

    document.addEventListener("keydown", onKeyDown);
    wrap.addEventListener("touchstart", onTouchStart, { passive: true });
    wrap.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("resize", onResize);
    soundBtn.addEventListener("click", onSoundClick);
    newGameBtn.addEventListener("click", onNewGame);
    overlayRestart.addEventListener("click", onNewGame);
    overlayContinue.addEventListener("click", onOverlayContinue);

    startGame();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      wrap.removeEventListener("touchstart", onTouchStart);
      wrap.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", onResize);
      soundBtn.removeEventListener("click", onSoundClick);
      newGameBtn.removeEventListener("click", onNewGame);
      overlayRestart.removeEventListener("click", onNewGame);
      overlayContinue.removeEventListener("click", onOverlayContinue);
      clearAllTiles();
    };
  }, []);

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
          2048
        </span>
      </div>

      <div className="mx-auto mt-6 flex max-w-md flex-col items-center text-center">
        <div className="flex gap-3">
          <div
            ref={scoreBoxRef}
            className="relative min-w-[90px] rounded-xl border border-qahwa-blanc/15 bg-white/5 px-4 py-2"
          >
            <span className="block text-[10px] uppercase tracking-wide text-qahwa-blanc/50">
              Score
            </span>
            <span
              ref={scoreValRef}
              className="font-display text-xl text-qahwa-orange"
            >
              0
            </span>
          </div>
          <div className="min-w-[90px] rounded-xl border border-qahwa-blanc/15 bg-white/5 px-4 py-2">
            <span className="block text-[10px] uppercase tracking-wide text-qahwa-blanc/50">
              Meilleur
            </span>
            <span
              ref={bestValRef}
              className="font-display text-xl text-qahwa-orange"
            >
              0
            </span>
          </div>
        </div>

        <div
          ref={gameWrapRef}
          className="relative mt-4 aspect-square w-full max-w-[340px] touch-none"
        >
          <div className="grid h-full w-full grid-cols-4 grid-rows-4 gap-[10px] rounded-xl bg-black p-[10px] shadow-2xl">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-[#211D1A]" />
            ))}
          </div>
          <div
            ref={tileLayerRef}
            className="absolute inset-[10px]"
          />
          <div
            ref={overlayRef}
            id="play2048-overlay"
            className="absolute inset-0 hidden flex-col items-center justify-center gap-3 rounded-xl bg-black/90 p-5 text-center"
          >
            <div ref={overlayTextRef} className="font-display text-lg uppercase text-qahwa-orange">
              Perdu !
            </div>
            <div className="flex gap-2">
              <button
                ref={overlayContinueRef}
                id="play2048-continue-btn"
                className="hidden rounded-lg border border-qahwa-blanc/20 bg-white/5 px-4 py-2 font-display text-xs uppercase text-qahwa-blanc"
              >
                Continuer
              </button>
              <button
                id="play2048-restart"
                className="rounded-lg border border-qahwa-orange bg-qahwa-orange px-4 py-2 font-display text-xs uppercase text-qahwa-noir"
              >
                Nouvelle partie
              </button>
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-qahwa-blanc/40">
          Glisse sur l&apos;ecran ou utilise les fleches du clavier
        </p>

        <div className="mt-4 flex gap-2">
          <button
            ref={soundBtnRef}
            className="rounded-lg border border-qahwa-blanc/20 bg-white/5 px-4 py-2 font-display text-xs uppercase text-qahwa-blanc"
          >
            Son : On
          </button>
          <button
            id="play2048-newgame"
            className="rounded-lg border border-qahwa-orange bg-qahwa-orange px-4 py-2 font-display text-xs uppercase text-qahwa-noir"
          >
            Nouvelle partie
          </button>
        </div>
      </div>

      <style jsx global>{`
        .tile {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-family: var(--font-display), sans-serif;
          transition: left 0.12s ease-in-out, top 0.12s ease-in-out;
          will-change: left, top;
        }
        .tile.new {
          animation: tilePop 0.18s ease-out;
        }
        .tile.merged {
          animation: tileMerge 0.16s ease-out 0.1s;
        }
        @keyframes tilePop {
          from {
            transform: scale(0.35);
            opacity: 0.2;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes tileMerge {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.18);
          }
          100% {
            transform: scale(1);
          }
        }
        .float-score {
          position: absolute;
          top: -4px;
          left: 50%;
          transform: translateX(-50%);
          font-family: var(--font-display), sans-serif;
          font-size: 0.85rem;
          color: #ff7e2e;
          opacity: 0;
          animation: floatUp 0.7s ease-out forwards;
          pointer-events: none;
        }
        @keyframes floatUp {
          0% {
            opacity: 0;
            transform: translate(-50%, 0);
          }
          20% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -26px);
          }
        }
        .value.bump {
          animation: bump 0.25s ease-out;
        }
        @keyframes bump {
          0% {
            transform: scale(1);
          }
          40% {
            transform: scale(1.22);
          }
          100% {
            transform: scale(1);
          }
        }
        #play2048-overlay.show {
          display: flex !important;
        }
      `}</style>
    </div>
  );
}