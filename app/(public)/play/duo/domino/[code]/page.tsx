"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/* =========================================================
   TYPES
   ========================================================= */

type PlayerNumber = 1 | 2;

/** `start` = pièce de départ : sert d'ancre fixe au centre du plateau (stocké dans le JSON du board) */
type Domino = { a: number; b: number; start?: boolean };

type GameStatus = "waiting" | "playing" | "finished";

type Game = {
  id: string;
  code: string;
  status: GameStatus;
  current_player: PlayerNumber;
  board: Domino[];
  boneyard: Domino[];
  winner: PlayerNumber | null;
};

type Player = {
  id: string;
  game_id: string;
  player_number: PlayerNumber;
  nickname: string;
  hand: Domino[];
  score: number;
};

type Session = { gameId: string; playerNumber: PlayerNumber };

const WIN_SCORE = 100;
const HAND_SIZE = 7;

/* =========================================================
   NORMALISATION
   ========================================================= */

function normalizeDomino(value: unknown): Domino | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (typeof item.a !== "number" || typeof item.b !== "number") return null;
  return item.start === true
    ? { a: item.a, b: item.b, start: true }
    : { a: item.a, b: item.b };
}

function normalizeDominos(value: unknown): Domino[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeDomino)
    .filter((d): d is Domino => d !== null);
}

function normalizeGame(value: unknown): Game | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || typeof item.code !== "string") return null;

  return {
    id: item.id,
    code: item.code,
    status:
      item.status === "playing"
        ? "playing"
        : item.status === "finished"
          ? "finished"
          : "waiting",
    current_player: item.current_player === 2 ? 2 : 1,
    board: normalizeDominos(item.board),
    boneyard: normalizeDominos(item.boneyard),
    winner: item.winner === 1 ? 1 : item.winner === 2 ? 2 : null,
  };
}

function normalizePlayer(value: unknown): Player | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== "string" ||
    typeof item.game_id !== "string" ||
    typeof item.nickname !== "string"
  ) {
    return null;
  }

  return {
    id: item.id,
    game_id: item.game_id,
    player_number: item.player_number === 2 ? 2 : 1,
    nickname: item.nickname,
    hand: normalizeDominos(item.hand),
    score: typeof item.score === "number" ? item.score : 0,
  };
}

function readSession(code: string): Session | null {
  for (const store of [window.sessionStorage, window.localStorage]) {
    try {
      const raw = store.getItem(`qahwa-domino-${code}`);
      if (!raw) continue;
      const data = JSON.parse(raw) as {
        gameId?: string;
        playerNumber?: number;
      };
      if (
        data.gameId &&
        (data.playerNumber === 1 || data.playerNumber === 2)
      ) {
        return { gameId: data.gameId, playerNumber: data.playerNumber };
      }
    } catch {
      /* session illisible : on essaie le stockage suivant */
    }
  }
  return null;
}

/* =========================================================
   RÈGLES
   ========================================================= */

const other = (n: PlayerNumber): PlayerNumber => (n === 1 ? 2 : 1);

const tileKey = (t: Domino) => `${Math.min(t.a, t.b)}-${Math.max(t.a, t.b)}`;

const pips = (tiles: Domino[]) =>
  tiles.reduce((sum, t) => sum + t.a + t.b, 0);

const leftEnd = (board: Domino[]): number | null => board[0]?.a ?? null;

const rightEnd = (board: Domino[]): number | null =>
  board[board.length - 1]?.b ?? null;

function fitsLeft(tile: Domino, board: Domino[]) {
  const end = leftEnd(board);
  return end === null || tile.a === end || tile.b === end;
}

function fitsRight(tile: Domino, board: Domino[]) {
  const end = rightEnd(board);
  return end === null || tile.a === end || tile.b === end;
}

function hasMove(hand: Domino[], board: Domino[]) {
  return hand.some((t) => fitsLeft(t, board) || fitsRight(t, board));
}

/** À gauche : le côté `b` de la nouvelle pièce doit toucher le `a` de la chaîne */
function orientLeft(tile: Domino, board: Domino[]): Domino {
  const end = leftEnd(board);
  if (end === null || tile.b === end) return { a: tile.a, b: tile.b };
  return { a: tile.b, b: tile.a };
}

/** À droite : le côté `a` de la nouvelle pièce doit toucher le `b` de la chaîne */
function orientRight(tile: Domino, board: Domino[]): Domino {
  const end = rightEnd(board);
  if (end === null || tile.a === end) return { a: tile.a, b: tile.b };
  return { a: tile.b, b: tile.a };
}

function createDominoSet(): Domino[] {
  const result: Domino[] = [];
  for (let a = 0; a <= 6; a += 1) {
    for (let b = a; b <= 6; b += 1) result.push({ a, b });
  }
  return result;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const x = result[i];
    const y = result[j];
    if (x !== undefined && y !== undefined) {
      result[i] = y;
      result[j] = x;
    }
  }
  return result;
}

/**
 * Distribution unique, utilisée pour la 1re manche, les manches suivantes et la revanche :
 * le plus gros double (sinon la plus grosse pièce) est posé au centre,
 * et c'est l'AUTRE joueur qui joue en premier.
 */
function dealRound() {
  const tiles = shuffle(createDominoSet());
  const hand1 = tiles.slice(0, HAND_SIZE);
  const hand2 = tiles.slice(HAND_SIZE, HAND_SIZE * 2);
  const boneyard = tiles.slice(HAND_SIZE * 2);

  const all = [
    ...hand1.map((tile) => ({ tile, owner: 1 as PlayerNumber })),
    ...hand2.map((tile) => ({ tile, owner: 2 as PlayerNumber })),
  ];

  const doubles = all
    .filter((x) => x.tile.a === x.tile.b)
    .sort((x, y) => y.tile.a - x.tile.a);

  const heaviest = [...all].sort(
    (x, y) =>
      y.tile.a + y.tile.b - (x.tile.a + x.tile.b) ||
      Math.max(y.tile.a, y.tile.b) - Math.max(x.tile.a, x.tile.b),
  );

  const best = doubles[0] ?? heaviest[0];
  if (!best) throw new Error("Distribution impossible.");

  const without = (hand: Domino[]) =>
    hand.filter((t) => tileKey(t) !== tileKey(best.tile));

  return {
    hand1: best.owner === 1 ? without(hand1) : hand1,
    hand2: best.owner === 2 ? without(hand2) : hand2,
    boneyard,
    board: [{ a: best.tile.a, b: best.tile.b, start: true }] as Domino[],
    firstPlayer: other(best.owner),
  };
}

/* =========================================================
   PLATEAU : la pièce de départ reste FIXE au centre.
   Chaque bras suit le bord du plateau puis TOURNE EN COIN :
   - bras droit  : droite → (coin) bas → gauche → (coin) bas → droite…
   - bras gauche : gauche → (coin) haut → droite → (coin) haut → gauche…
   Les doubles sont posés en travers du sens de la chaîne.
   ========================================================= */

type Dir = "right" | "left" | "down" | "up";
type Rect = { x: number; y: number; w: number; h: number };

type Placed = {
  tile: Domino;
  key: string;
  x: number;
  y: number;
  vertical: boolean;
  flip: boolean;
};

const TILE_LONG = 62;
const TILE_SHORT = 42;
const MARGIN = 24;
/** nombre de pièces posées à la verticale à chaque coin */
const VERT_RUN = 2;

const isHorizontal = (d: Dir) => d === "left" || d === "right";

function tileSize(tile: Domino, dir: Dir) {
  const isDouble = tile.a === tile.b;
  const horizontalShape = isHorizontal(dir) ? !isDouble : isDouble;
  return horizontalShape
    ? { w: TILE_LONG, h: TILE_SHORT }
    : { w: TILE_SHORT, h: TILE_LONG };
}

function buildLayout(board: Domino[], width: number) {
  const empty = { placed: [] as Placed[], minY: 0, maxY: 0 };
  if (board.length === 0) return empty;

  const startIndex = Math.max(
    0,
    board.findIndex((t) => t.start),
  );
  const center = board[startIndex];
  if (!center) return empty;

  const centerSize = tileSize(center, "right");
  const centerRect: Rect = { x: width / 2, y: 0, ...centerSize };

  const placed: Placed[] = [
    {
      tile: center,
      key: tileKey(center),
      x: centerRect.x,
      y: centerRect.y,
      vertical: centerRect.h > centerRect.w,
      flip: false,
    },
  ];
  const rects: Rect[] = [centerRect];

  const layoutArm = (tiles: Domino[], side: "left" | "right") => {
    const turnDir: Dir = side === "right" ? "down" : "up";
    let dir: Dir = side === "right" ? "right" : "left";
    let lastH: Dir = dir;
    let prev: Rect = centerRect;
    let vertCount = 0;

    for (const tile of tiles) {
      let rect: Rect;

      if (isHorizontal(dir)) {
        const { w, h } = tileSize(tile, dir);
        const x =
          dir === "right"
            ? prev.x + prev.w / 2 + w / 2
            : prev.x - prev.w / 2 - w / 2;

        if (x - w / 2 >= MARGIN && x + w / 2 <= width - MARGIN) {
          // on continue tout droit
          rect = { x, y: prev.y, w, h };
        } else {
          // bord atteint : COIN (horizontal → vertical), aligné sur le bord extérieur
          const hDir = dir;
          dir = turnDir;
          const s = tileSize(tile, dir);
          rect = {
            w: s.w,
            h: s.h,
            x:
              hDir === "right"
                ? prev.x + prev.w / 2 - s.w / 2
                : prev.x - prev.w / 2 + s.w / 2,
            y:
              dir === "down"
                ? prev.y + prev.h / 2 + s.h / 2
                : prev.y - prev.h / 2 - s.h / 2,
          };
          vertCount = 1;
        }
      } else if (vertCount < VERT_RUN) {
        // on continue dans le sens vertical
        const { w, h } = tileSize(tile, dir);
        rect = {
          w,
          h,
          x: prev.x,
          y:
            dir === "down"
              ? prev.y + prev.h / 2 + h / 2
              : prev.y - prev.h / 2 - h / 2,
        };
        vertCount += 1;
      } else {
        // fin de la descente/montée : COIN (vertical → horizontal), sens inversé
        const vDir = dir;
        dir = lastH === "right" ? "left" : "right";
        const s = tileSize(tile, dir);
        rect = {
          w: s.w,
          h: s.h,
          y:
            vDir === "down"
              ? prev.y + prev.h / 2 + s.h / 2
              : prev.y - prev.h / 2 - s.h / 2,
          x:
            dir === "left"
              ? prev.x + prev.w / 2 - s.w / 2
              : prev.x - prev.w / 2 + s.w / 2,
        };
        vertCount = 0;
      }

      if (isHorizontal(dir)) lastH = dir;

      // L'ordre visuel (gauche→droite / haut→bas) doit suivre l'ordre de la chaîne
      const positive = dir === "right" || dir === "down";
      const chainPositive = side === "right" ? positive : !positive;

      placed.push({
        tile,
        key: tileKey(tile),
        x: rect.x,
        y: rect.y,
        vertical: rect.h > rect.w,
        flip: !chainPositive,
      });
      rects.push(rect);
      prev = rect;
    }
  };

  layoutArm(board.slice(startIndex + 1), "right");
  layoutArm(board.slice(0, startIndex).reverse(), "left");

  return {
    placed,
    minY: Math.min(...rects.map((r) => r.y - r.h / 2)),
    maxY: Math.max(...rects.map((r) => r.y + r.h / 2)),
  };
}

/* =========================================================
   PIPS
   ========================================================= */

const PIP_POSITIONS: Record<number, string[]> = {
  0: [],
  1: ["left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"],
  2: ["left-[15%] top-[15%]", "right-[15%] bottom-[15%]"],
  3: [
    "left-[15%] top-[15%]",
    "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
    "right-[15%] bottom-[15%]",
  ],
  4: [
    "left-[15%] top-[15%]",
    "right-[15%] top-[15%]",
    "left-[15%] bottom-[15%]",
    "right-[15%] bottom-[15%]",
  ],
  5: [
    "left-[15%] top-[15%]",
    "right-[15%] top-[15%]",
    "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
    "left-[15%] bottom-[15%]",
    "right-[15%] bottom-[15%]",
  ],
  6: [
    "left-[15%] top-[8%]",
    "right-[15%] top-[8%]",
    "left-[15%] top-1/2 -translate-y-1/2",
    "right-[15%] top-1/2 -translate-y-1/2",
    "left-[15%] bottom-[8%]",
    "right-[15%] bottom-[8%]",
  ],
};

function PipFace({ value, small = false }: { value: number; small?: boolean }) {
  const dotSize = small ? "h-[5px] w-[5px]" : "h-[8px] w-[8px]";

  return (
    <div className="relative aspect-square w-[72%] max-w-[34px]">
      {(PIP_POSITIONS[value] ?? []).map((position, index) => (
        <span
          key={index}
          className={[
            "absolute rounded-full bg-[#050505]",
            dotSize,
            "shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_1px_1px_rgba(0,0,0,0.45)]",
            position,
          ].join(" ")}
        />
      ))}
    </div>
  );
}

/* =========================================================
   PIÈCE DOMINO
   ========================================================= */

function DominoTile({
  tile,
  vertical = false,
  small = false,
  flip = false,
  playable = false,
  selected = false,
  onClick,
}: {
  tile: Domino;
  vertical?: boolean;
  small?: boolean;
  flip?: boolean;
  playable?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const clickable = Boolean(onClick);
  const first = flip ? tile.b : tile.a;
  const second = flip ? tile.a : tile.b;

  const size = vertical
    ? small
      ? "h-[62px] w-[42px]"
      : "h-[104px] w-[58px]"
    : small
      ? "h-[42px] w-[62px]"
      : "h-[58px] w-[104px]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={[
        "relative shrink-0 overflow-hidden rounded-[9px] border-[2px] bg-[#F5F1E8]",
        "shadow-[0_3px_0_#AAA398,0_5px_10px_rgba(0,0,0,0.35)] transition-all duration-150",
        size,
        selected || playable ? "border-[#FF6B00]" : "border-[#C7C0B4]",
        selected
          ? "-translate-y-1 ring-2 ring-[#FF6B00]/50"
          : playable
            ? "hover:-translate-y-1"
            : "",
        clickable ? "cursor-pointer active:scale-95" : "cursor-default",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[7px] bg-gradient-to-br from-white via-transparent to-[#D8D2C6]/70" />

      <div
        className={[
          "relative flex h-full w-full",
          vertical ? "flex-col" : "flex-row",
        ].join(" ")}
      >
        <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
          <PipFace value={first} small={small} />
        </div>

        <div
          className={[
            "shrink-0 rounded-full bg-[#252525]",
            vertical ? "mx-1.5 h-[2px]" : "my-1.5 w-[2px]",
          ].join(" ")}
        />

        <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
          <PipFace value={second} small={small} />
        </div>
      </div>
    </button>
  );
}

/* =========================================================
   ICÔNE
   ========================================================= */

function DominoIcon() {
  return (
    <div className="relative h-10 w-6 rotate-[-12deg] overflow-hidden rounded-[5px] border-2 border-[#C7C0B4] bg-[#F5F1E8] shadow-[0_4px_10px_rgba(0,0,0,0.45)]">
      <div className="absolute left-1/2 top-1/2 h-[2px] w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#252525]" />
      <span className="absolute left-1/2 top-[25%] h-[4px] w-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#080808]" />
      <span className="absolute left-[27%] top-[72%] h-[3px] w-[3px] rounded-full bg-[#080808]" />
      <span className="absolute right-[27%] top-[72%] h-[3px] w-[3px] rounded-full bg-[#080808]" />
    </div>
  );
}

/* =========================================================
   BADGE JOUEUR
   ========================================================= */

function PlayerBadge({
  nickname,
  active,
  score,
  tiles,
}: {
  nickname: string;
  active: boolean;
  score: number;
  tiles: number;
}) {
  return (
    <div
      className={[
        "flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition",
        active
          ? "border-[#FF6B00]/25 bg-[#FF6B00]/5"
          : "border-white/5 bg-[#111]",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black",
          active ? "bg-[#FF6B00] text-black" : "bg-[#1D1D1D] text-white/50",
        ].join(" ")}
      >
        {nickname.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0">
        <p className="max-w-[110px] truncate text-xs font-black">{nickname}</p>
        <p
          className={[
            "text-[8px] font-black uppercase tracking-[0.2em]",
            active ? "text-[#FF6B00]" : "text-white/20",
          ].join(" ")}
        >
          {active ? "À toi" : `${tiles} pièce${tiles > 1 ? "s" : ""}`}
        </p>
      </div>

      <div className="ml-auto text-right">
        <p className="text-[7px] font-black uppercase tracking-[0.15em] text-white/20">
          Score
        </p>
        <p className="text-sm font-black text-[#FF6B00]">{score}</p>
      </div>
    </div>
  );
}

/* =========================================================
   PLATEAU
   ========================================================= */

function RealDominoBoard({ board }: { board: Domino[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 360, h: 380 });
  const [anim, setAnim] = useState<Set<string>>(new Set());
  const prevKeys = useRef<Set<string> | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({
        w: Math.max(280, Math.floor(entry.contentRect.width)),
        h: Math.max(200, Math.floor(entry.contentRect.height)),
      });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(
    () => buildLayout(board, size.w),
    [board, size.w],
  );

  // Animation : on repère la/les pièces réellement nouvelles (gauche OU droite)
  const boardSig = board.map(tileKey).join(",");

  useEffect(() => {
    const keys = new Set(boardSig ? boardSig.split(",") : []);
    const previous = prevKeys.current;
    prevKeys.current = keys;
    if (!previous) return;

    const added = [...keys].filter((k) => !previous.has(k));
    if (added.length === 0) return;

    setAnim(new Set(added));
    const timer = window.setTimeout(() => setAnim(new Set()), 400);
    return () => window.clearTimeout(timer);
  }, [boardSig]);

  const contentH = Math.max(1, layout.maxY - layout.minY);
  const scale = Math.min(1, (size.h - 24) / contentH);
  const midY = (layout.minY + layout.maxY) / 2;

  return (
    <div
      ref={wrapRef}
      className="relative min-h-[300px] flex-1 overflow-hidden bg-[#101010] shadow-[inset_0_0_100px_rgba(0,0,0,0.85)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,107,0,0.05),transparent_62%)]" />

      {layout.placed.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/20">
            Plateau vide
          </p>
        </div>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          {layout.placed.map((p, index) => (
            <div
              key={p.key}
              className="absolute"
              style={{
                left: p.x,
                top: size.h / 2 + p.y - midY,
                transform: "translate(-50%, -50%)",
                zIndex: index + 10,
              }}
            >
              <div className={anim.has(p.key) ? "qd-in" : ""}>
                <DominoTile
                  tile={p.tile}
                  vertical={p.vertical}
                  flip={p.flip}
                  small
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 right-4 rounded-full border border-white/5 bg-[#0C0C0C]/70 px-3 py-1.5">
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/25">
          {board.length} domino{board.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* <style> classique (pas styled-jsx : il renomme les @keyframes) */}
      <style>{`
        @keyframes qdIn {
          0%   { opacity: 0; transform: scale(0.72) rotate(-6deg); }
          70%  { opacity: 1; transform: scale(1.06) rotate(1deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        .qd-in { animation: qdIn 260ms ease-out; }
      `}</style>
    </div>
  );
}

/* =========================================================
   PAGE
   ========================================================= */

export default function DominoRoomPage() {
  const params = useParams();
  const codeValue = params?.code;
  const code =
    typeof codeValue === "string"
      ? codeValue
      : Array.isArray(codeValue)
        ? (codeValue[0] ?? "")
        : "";

  // Pas de types Supabase générés ici : `any` assumé
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = useMemo(() => createSupabaseBrowserClient() as any, []);

  const [session, setSession] = useState<Session | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [me, setMe] = useState<Player | null>(null);
  const [opponent, setOpponent] = useState<Player | null>(null);

  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedTile, setSelectedTile] = useState<number | null>(null);

  const loadSeq = useRef(0);
  const startingRef = useRef(false);
  const live = useRef<{
    game: Game | null;
    me: Player | null;
    opponent: Player | null;
  }>({ game: null, me: null, opponent: null });
  live.current = { game, me, opponent };

  /* ---------- session ---------- */

  useEffect(() => {
    if (!code) return;
    const found = readSession(code);
    if (!found) {
      setFatal("Session Domino introuvable.");
      setLoading(false);
      return;
    }
    setSession(found);
  }, [code]);

  /* ---------- chargement ---------- */

  const loadGame = useCallback(async () => {
    if (!session) return;
    const seq = ++loadSeq.current;

    try {
      // Séquentiel : si la partie est « finished », le score est forcément déjà écrit
      const gameRes = await supabase
        .from("duo_domino_games")
        .select("*")
        .eq("id", session.gameId)
        .maybeSingle();
      if (gameRes.error) throw new Error(gameRes.error.message);

      const playersRes = await supabase
        .from("duo_domino_players")
        .select("*")
        .eq("game_id", session.gameId);
      if (playersRes.error) throw new Error(playersRes.error.message);

      // une réponse plus ancienne ne doit jamais écraser une plus récente
      if (seq !== loadSeq.current) return;

      const normalizedGame = normalizeGame(gameRes.data);
      if (!normalizedGame) {
        setFatal("Partie introuvable.");
        setLoading(false);
        return;
      }

      const players = ((playersRes.data ?? []) as unknown[])
        .map(normalizePlayer)
        .filter((p): p is Player => p !== null);

      setGame(normalizedGame);
      setMe(players.find((p) => p.player_number === session.playerNumber) ?? null);
      setOpponent(
        players.find((p) => p.player_number !== session.playerNumber) ?? null,
      );
      setFatal("");
      setLoading(false);
    } catch (err) {
      console.error(err);
      if (seq !== loadSeq.current) return;
      setFatal(err instanceof Error ? err.message : "Erreur de chargement.");
      setLoading(false);
    }
  }, [session, supabase]);

  /* ---------- realtime (filtré sur CETTE partie) ---------- */

  useEffect(() => {
    if (!session) return;

    void loadGame();

    let timer: number | null = null;
    const schedule = () => {
      if (timer !== null) return;
      timer = window.setTimeout(() => {
        timer = null;
        void loadGame();
      }, 60);
    };

    const channel = supabase
      .channel(`domino-${session.gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "duo_domino_games",
          filter: `id=eq.${session.gameId}`,
        },
        schedule,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "duo_domino_players",
          filter: `game_id=eq.${session.gameId}`,
        },
        schedule,
      )
      .subscribe();

    // filet de sécurité si un événement realtime est perdu
    const poll = window.setInterval(() => void loadGame(), 8000);

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [session, loadGame, supabase]);

  /* =======================================================
     ÉTAT DÉRIVÉ
     ======================================================= */

  const myTurn =
    game !== null &&
    me !== null &&
    game.status === "playing" &&
    game.current_player === me.player_number;

  const playableTiles = useMemo(() => {
    const result = new Set<number>();
    if (!game || !me || !myTurn) return result;
    me.hand.forEach((tile, index) => {
      if (fitsLeft(tile, game.board) || fitsRight(tile, game.board)) {
        result.add(index);
      }
    });
    return result;
  }, [game, me, myTurn]);

  const hasPlayableTile = playableTiles.size > 0;
  const boneyardCount = game?.boneyard.length ?? 0;
  const canDraw = myTurn && boneyardCount > 0 && !hasPlayableTile;
  const canPass = myTurn && boneyardCount === 0 && !hasPlayableTile;

  const matchOver =
    game?.status === "finished" &&
    ((me?.score ?? 0) >= WIN_SCORE || (opponent?.score ?? 0) >= WIN_SCORE);

  const matchWinner: Player | null =
    matchOver && me && opponent
      ? me.score > opponent.score
        ? me
        : opponent.score > me.score
          ? opponent
          : null
      : null;

  const isHost = me?.player_number === 1;
  const hasOpponent = opponent !== null;
  const status = game?.status;
  const roundKey = game
    ? `${game.id}:${game.board.length}:${game.winner}:${me?.score}:${opponent?.score}`
    : "";

  const selectedDomino =
    selectedTile !== null && me ? (me.hand[selectedTile] ?? null) : null;

  // on désélectionne si la sélection n'est plus valable
  useEffect(() => {
    if (selectedTile !== null && !playableTiles.has(selectedTile)) {
      setSelectedTile(null);
    }
  }, [playableTiles, selectedTile]);

  /* =======================================================
     DISTRIBUTION (1re manche, manches suivantes, revanche)
     ======================================================= */

  const dealAndStart = useCallback(
    async (resetScores: boolean) => {
      const { game: g, me: m, opponent: o } = live.current;
      if (!g || !m || !o) return;

      const p1 = m.player_number === 1 ? m : o;
      const p2 = m.player_number === 1 ? o : m;
      const deal = dealRound();

      const updateHand = (id: string, hand: Domino[]) =>
        supabase
          .from("duo_domino_players")
          .update(resetScores ? { hand, score: 0 } : { hand })
          .eq("id", id);

      const [r1, r2] = await Promise.all([
        updateHand(p1.id, deal.hand1),
        updateHand(p2.id, deal.hand2),
      ]);
      if (r1.error) throw new Error(r1.error.message);
      if (r2.error) throw new Error(r2.error.message);

      const { error: gameError } = await supabase
        .from("duo_domino_games")
        .update({
          status: "playing",
          current_player: deal.firstPlayer,
          board: deal.board,
          boneyard: deal.boneyard,
          winner: null,
        })
        .eq("id", g.id);
      if (gameError) throw new Error(gameError.message);

      setSelectedTile(null);
      await loadGame();
    },
    [supabase, loadGame],
  );

  async function startMatch() {
    if (!isHost || busy) return;
    setBusy(true);
    setError("");
    try {
      await dealAndStart(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de démarrer.");
    } finally {
      setBusy(false);
    }
  }

  /* ---------- manche suivante automatique (hôte uniquement) ---------- */

  useEffect(() => {
    if (!isHost || !hasOpponent || status !== "finished" || matchOver) return;

    const timer = window.setTimeout(() => {
      if (startingRef.current) return;
      startingRef.current = true;
      dealAndStart(false)
        .catch((err) => console.error(err))
        .finally(() => {
          startingRef.current = false;
        });
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [isHost, hasOpponent, status, matchOver, roundKey, dealAndStart]);

  /* =======================================================
     FIN DE MANCHE
     ======================================================= */

  async function finishRound(
    g: Game,
    winner: Player | null,
    points: number,
    board: Domino[],
  ) {
    // 1) le score d'abord (relu en base pour éviter un état périmé)…
    if (winner && points > 0) {
      const { data } = await supabase
        .from("duo_domino_players")
        .select("score")
        .eq("id", winner.id)
        .maybeSingle();

      const base = typeof data?.score === "number" ? data.score : winner.score;

      const { error: scoreError } = await supabase
        .from("duo_domino_players")
        .update({ score: base + points })
        .eq("id", winner.id);
      if (scoreError) throw new Error(scoreError.message);
    }

    // 2) …puis le statut, en UNE seule écriture (plus de double update)
    const { error: gameError } = await supabase
      .from("duo_domino_games")
      .update({
        board,
        status: "finished",
        winner: winner?.player_number ?? null,
        current_player: winner?.player_number ?? g.current_player,
      })
      .eq("id", g.id);
    if (gameError) throw new Error(gameError.message);
  }

  /* =======================================================
     JOUER (gauche / droite)
     ======================================================= */

  async function playTile(side: "left" | "right") {
    const g = game;
    const m = me;
    if (!g || !m || busy || selectedTile === null) return;
    if (g.status !== "playing" || g.current_player !== m.player_number) return;

    const tile = m.hand[selectedTile];
    if (!tile) return;

    const fits =
      side === "left" ? fitsLeft(tile, g.board) : fitsRight(tile, g.board);
    if (!fits) {
      setError(
        `Ce domino ne correspond pas à ${side === "left" ? "gauche" : "droite"}.`,
      );
      return;
    }

    setBusy(true);
    setError("");

    try {
      const played =
        side === "left" ? orientLeft(tile, g.board) : orientRight(tile, g.board);
      const board = side === "left" ? [played, ...g.board] : [...g.board, played];
      const hand = m.hand.filter((_, index) => index !== selectedTile);

      const { error: handError } = await supabase
        .from("duo_domino_players")
        .update({ hand })
        .eq("id", m.id);
      if (handError) throw new Error(handError.message);

      if (hand.length === 0) {
        const loserHand = opponent?.hand ?? [];
        await finishRound(g, m, pips(loserHand), board);
      } else {
        const { error: gameError } = await supabase
          .from("duo_domino_games")
          .update({ board, current_player: other(m.player_number) })
          .eq("id", g.id);
        if (gameError) throw new Error(gameError.message);
      }

      setSelectedTile(null);
      await loadGame();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de jouer.");
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     PIOCHER
     ======================================================= */

  async function drawTile() {
    const g = game;
    const m = me;
    if (!g || !m || busy) return;
    if (g.status !== "playing" || g.current_player !== m.player_number) return;

    if (hasMove(m.hand, g.board)) {
      setError("Tu as déjà un domino jouable. Joue-le avant de piocher.");
      return;
    }

    const tile = g.boneyard[0];
    if (!tile) {
      setError("La pioche est vide. Tu peux passer.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const { error: handError } = await supabase
        .from("duo_domino_players")
        .update({ hand: [...m.hand, tile] })
        .eq("id", m.id);
      if (handError) throw new Error(handError.message);

      const { error: gameError } = await supabase
        .from("duo_domino_games")
        .update({ boneyard: g.boneyard.slice(1) })
        .eq("id", g.id);
      if (gameError) throw new Error(gameError.message);

      await loadGame();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de piocher.");
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     PASSER (+ détection de partie bloquée)
     ======================================================= */

  async function passTurn() {
    const g = game;
    const m = me;
    const o = opponent;
    if (!g || !m || busy) return;
    if (g.status !== "playing" || g.current_player !== m.player_number) return;

    if (hasMove(m.hand, g.board)) {
      setError("Tu as encore un domino jouable. Tu ne peux pas passer.");
      return;
    }
    if (g.boneyard.length > 0) {
      setError("La pioche n'est pas vide. Tu dois piocher.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const opponentStuck = o !== null && !hasMove(o.hand, g.board);

      if (opponentStuck && o) {
        // Personne ne peut jouer : manche bloquée.
        // Le plus petit total gagne et marque la différence ; égalité = manche nulle.
        const mine = pips(m.hand);
        const theirs = pips(o.hand);

        if (mine === theirs) {
          await finishRound(g, null, 0, g.board);
        } else {
          await finishRound(
            g,
            mine < theirs ? m : o,
            Math.abs(mine - theirs),
            g.board,
          );
        }
      } else {
        const { error: gameError } = await supabase
          .from("duo_domino_games")
          .update({ current_player: other(m.player_number) })
          .eq("id", g.id);
        if (gameError) throw new Error(gameError.message);
      }

      await loadGame();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de passer.");
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     LOADING / ERREUR
     ======================================================= */

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#080808] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#FF6B00]/30 bg-[#151515]">
            <DominoIcon />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#FF6B00]">
            DOMINO
          </p>
        </div>
      </main>
    );
  }

  if (!game || !me) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#080808] px-5 text-white">
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-6 text-center">
          <p className="text-sm text-white/60">
            {fatal || "Partie introuvable."}
          </p>
        </div>
      </main>
    );
  }

  /* =======================================================
     BANDEAU DE STATUT
     ======================================================= */

  let banner = "";
  let bannerActive = false;

  if (game.status === "finished") {
    bannerActive = true;
    if (matchOver) {
      banner = matchWinner
        ? matchWinner.id === me.id
          ? "🏆 TU AS GAGNÉ LA PARTIE"
          : "TON ADVERSAIRE A GAGNÉ LA PARTIE"
        : "ÉGALITÉ";
    } else if (game.winner === null) {
      banner = "MANCHE NULLE · NOUVELLE MANCHE…";
    } else if (game.winner === me.player_number) {
      banner = "🏆 MANCHE GAGNÉE · NOUVELLE MANCHE…";
    } else {
      banner = "MANCHE PERDUE · NOUVELLE MANCHE…";
    }
  } else if (myTurn) {
    banner = "● À TOI DE JOUER";
    bannerActive = true;
  } else {
    banner = "● TOUR ADVERSE";
  }

  /* =======================================================
     INTERFACE
     ======================================================= */

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#080808] text-white">
      <div className="mx-auto flex min-h-[100dvh] max-w-[1100px] flex-col px-3 py-3 sm:px-5">
        {/* HEADER */}
        <header className="mb-3 flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#FF6B00]/15 bg-[#111]">
              <DominoIcon />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#FF6B00]">
                Qahwa Duo
              </p>
              <h1 className="text-lg font-black">Domino</h1>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-[#111] px-3 py-2 text-right">
            <p className="text-[7px] font-black uppercase tracking-[0.2em] text-white/20">
              Partie · {WIN_SCORE} pts
            </p>
            <p className="mt-0.5 text-xs font-black tracking-[0.18em] text-[#FF6B00]">
              {game.code}
            </p>
          </div>
        </header>

        {/* JOUEURS */}
        <section className="mb-3 grid grid-cols-2 gap-2">
          <PlayerBadge
            nickname={me.nickname}
            active={myTurn}
            score={me.score}
            tiles={me.hand.length}
          />

          {opponent ? (
            <PlayerBadge
              nickname={opponent.nickname}
              active={!myTurn && game.status === "playing"}
              score={opponent.score}
              tiles={opponent.hand.length}
            />
          ) : (
            <div className="rounded-2xl border border-white/5 bg-[#111] px-3 py-2.5">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">
                Adversaire
              </p>
              <p className="mt-2 text-xs font-bold text-white/30">
                En attente...
              </p>
            </div>
          )}
        </section>

        {/* ATTENTE */}
        {game.status === "waiting" && (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-md rounded-[28px] border border-white/5 bg-[#111] p-7 text-center shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-[#FF6B00]/15 bg-[#171717]">
                <DominoIcon />
              </div>

              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#FF6B00]">
                Qahwa Duo
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {opponent
                  ? "Les deux joueurs sont prêts"
                  : "En attente du joueur 2"}
              </h2>

              <div className="my-6 rounded-2xl border border-[#FF6B00]/15 bg-[#0B0B0B] px-5 py-4">
                <p className="text-[8px] font-black uppercase tracking-[0.25em] text-white/20">
                  Code de la partie
                </p>
                <p className="mt-2 text-3xl font-black tracking-[0.3em] text-[#FF6B00]">
                  {game.code}
                </p>
              </div>

              {opponent ? (
                isHost ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void startMatch()}
                    className="w-full rounded-2xl bg-[#FF6B00] py-4 text-sm font-black text-black transition hover:bg-[#ff7b1a] disabled:opacity-50"
                  >
                    {busy ? "PRÉPARATION..." : "COMMENCER LA PARTIE"}
                  </button>
                ) : (
                  <div className="rounded-2xl border border-[#FF6B00]/10 bg-[#FF6B00]/5 px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#FF6B00]">
                    Le joueur 1 va lancer la partie
                  </div>
                )
              ) : (
                <div className="rounded-2xl border border-white/5 bg-[#0D0D0D] px-4 py-4 text-xs font-bold text-white/30">
                  Partage le code avec ton binôme.
                </div>
              )}
            </div>
          </div>
        )}

        {/* PARTIE */}
        {game.status !== "waiting" && (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* STATUS */}
            <div
              className={[
                "mb-2 flex h-9 shrink-0 items-center justify-center rounded-xl border text-[10px] font-black uppercase tracking-[0.2em]",
                bannerActive
                  ? "border-[#FF6B00]/20 bg-[#FF6B00]/5 text-[#FF6B00]"
                  : "border-white/5 bg-[#111] text-white/25",
              ].join(" ")}
            >
              {banner}
            </div>

            {/* FIN DE PARTIE */}
            {matchOver && (
              <div className="mb-2 rounded-2xl border border-[#FF6B00]/20 bg-[#0B0B0B] p-4 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">
                  Score final
                </p>
                <p className="mt-1 text-2xl font-black text-[#FF6B00]">
                  {me.score} – {opponent?.score ?? 0}
                </p>

                {isHost ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void startMatch()}
                    className="mt-3 w-full rounded-xl bg-[#FF6B00] py-3 text-xs font-black text-black transition hover:bg-[#ff7b1a] disabled:opacity-50"
                  >
                    {busy ? "PRÉPARATION..." : "REVANCHE"}
                  </button>
                ) : (
                  <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                    Le joueur 1 peut lancer la revanche
                  </p>
                )}
              </div>
            )}

            {/* PLATEAU */}
            <section className="mb-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101010]">
              <div className="flex h-8 shrink-0 items-center justify-between border-b border-white/5 px-3">
                <span className="text-[8px] font-black uppercase tracking-[0.25em] text-white/20">
                  PLATEAU
                </span>
                <span className="text-[9px] font-black text-white/30">
                  {leftEnd(game.board) ?? "–"} ◂ ▸ {rightEnd(game.board) ?? "–"}
                </span>
              </div>

              <RealDominoBoard board={game.board} />
            </section>

            {/* GAUCHE / DROITE */}
            {selectedDomino && myTurn && (
              <div className="mb-2 grid h-11 shrink-0 grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy || !fitsLeft(selectedDomino, game.board)}
                  onClick={() => void playLeft()}
                  className="rounded-xl border border-white/10 bg-[#151515] text-xs font-black transition hover:border-[#FF6B00]/40 disabled:opacity-20"
                >
                  ← GAUCHE ({leftEnd(game.board)})
                </button>

                <button
                  type="button"
                  disabled={busy || !fitsRight(selectedDomino, game.board)}
                  onClick={() => void playRight()}
                  className="rounded-xl bg-[#FF6B00] text-xs font-black text-black transition hover:bg-[#ff7b1a] disabled:opacity-30"
                >
                  DROITE ({rightEnd(game.board)}) →
                </button>
              </div>
            )}

            {/* MAIN ADVERSE RÉVÉLÉE EN FIN DE MANCHE */}
            {game.status === "finished" && opponent && opponent.hand.length > 0 && (
              <section className="mb-2 shrink-0 rounded-2xl border border-white/8 bg-[#111] px-3 py-2">
                <p className="mb-1.5 text-[8px] font-black uppercase tracking-[0.25em] text-white/20">
                  Main de {opponent.nickname} · {pips(opponent.hand)} pts
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {opponent.hand.map((tile, index) => (
                    <DominoTile
                      key={`${index}-${tileKey(tile)}`}
                      tile={tile}
                      small
                    />
                  ))}
                </div>
              </section>
            )}

            {/* MAIN DU JOUEUR */}
            <section className="mb-2 shrink-0 rounded-2xl border border-white/8 bg-[#111]">
              <div className="flex h-8 items-center justify-between border-b border-white/5 px-3">
                <span className="text-[8px] font-black uppercase tracking-[0.25em] text-white/20">
                  TA MAIN
                </span>
                <span className="text-[9px] font-black text-[#FF6B00]">
                  {me.hand.length} • 🂠 {game.boneyard.length}
                </span>
              </div>

              <div className="flex min-h-[100px] items-end gap-1.5 overflow-x-auto px-2 pb-2 pt-2 [&>*:first-child]:ml-auto [&>*:last-child]:mr-auto">
                {me.hand.map((tile, index) => {
                  const playable = myTurn && playableTiles.has(index);
                  return (
                    <DominoTile
                      key={`${index}-${tileKey(tile)}`}
                      tile={tile}
                      vertical
                      playable={playable}
                      selected={selectedTile === index}
                      onClick={playable ? () => setSelectedTile(index) : undefined}
                    />
                  );
                })}
              </div>
            </section>

            {/* PIOCHER / PASSER */}
            {myTurn && game.status === "playing" && (
              <div className="grid h-11 shrink-0 grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy || !canDraw}
                  onClick={() => void drawTile()}
                  className={[
                    "rounded-xl border text-xs font-black transition",
                    canDraw
                      ? "border-[#FF6B00]/30 bg-[#151515] text-white hover:border-[#FF6B00] hover:bg-[#191919]"
                      : "border-white/5 bg-[#111] text-white/20",
                  ].join(" ")}
                >
                  🂠 PIOCHER{" "}
                  <span className={canDraw ? "text-[#FF6B00]" : "text-white/20"}>
                    {game.boneyard.length}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={busy || !canPass}
                  onClick={() => void passTurn()}
                  className={[
                    "rounded-xl border text-xs font-black transition",
                    canPass
                      ? "border-[#FF6B00]/30 bg-[#151515] text-white hover:border-[#FF6B00] hover:bg-[#191919]"
                      : "border-white/5 bg-[#111] text-white/20",
                  ].join(" ")}
                >
                  PASSER
                </button>
              </div>
            )}

            {!myTurn && game.status === "playing" && (
              <div className="flex h-11 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-[#111] text-[9px] font-black uppercase tracking-widest text-white/20">
                Tour de {opponent?.nickname ?? "l'adversaire"}
              </div>
            )}
          </div>
        )}

        {/* ERREUR D'ACTION */}
        {error && (
          <div className="mt-2 shrink-0 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-center text-[10px] font-bold text-red-300">
            {error}
          </div>
        )}
      </div>
    </main>
  );

  /* ---- raccourcis (déclarés après le return pour la lisibilité, hoistés) ---- */
  function playLeft() {
    return playTile("left");
  }
  function playRight() {
    return playTile("right");
  }
}
