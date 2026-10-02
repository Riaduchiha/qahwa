"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PlayerNumber = 1 | 2;

type Domino = {
  a: number;
  b: number;
};

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

/* =========================================================
   POINTS DU DOMINO
   ========================================================= */

function PipFace({
  value,
  small = false,
}: {
  value: number;
  small?: boolean;
}) {
  const dotSize = small
    ? "h-[6px] w-[6px]"
    : "h-[8px] w-[8px]";

  const positions: Record<
    number,
    string[]
  > = {
    0: [],

    1: [
      "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
    ],

    2: [
      "left-[14%] top-[14%]",
      "right-[14%] bottom-[14%]",
    ],

    3: [
      "left-[14%] top-[14%]",
      "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
      "right-[14%] bottom-[14%]",
    ],

    4: [
      "left-[14%] top-[14%]",
      "right-[14%] top-[14%]",
      "left-[14%] bottom-[14%]",
      "right-[14%] bottom-[14%]",
    ],

    5: [
      "left-[14%] top-[14%]",
      "right-[14%] top-[14%]",
      "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
      "left-[14%] bottom-[14%]",
      "right-[14%] bottom-[14%]",
    ],

    6: [
      "left-[14%] top-[8%]",
      "right-[14%] top-[8%]",
      "left-[14%] top-1/2 -translate-y-1/2",
      "right-[14%] top-1/2 -translate-y-1/2",
      "left-[14%] bottom-[8%]",
      "right-[14%] bottom-[8%]",
    ],
  };

  return (
    <div className="relative aspect-square w-[72%] max-w-[34px]">
      {(positions[value] ?? []).map(
        (position, index) => (
          <span
            key={index}
            className={[
              "absolute rounded-full bg-[#050505]",
              dotSize,
              "shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_1px_1px_rgba(0,0,0,0.45)]",
              position,
            ].join(" ")}
          />
        ),
      )}
    </div>
  );
}

/* =========================================================
   DOMINO
   ========================================================= */

function DominoTile({
  tile,
  vertical = false,
  small = false,
  playable = false,
  selected = false,
  onClick,
}: {
  tile: Domino;
  vertical?: boolean;
  small?: boolean;
  playable?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const clickable = Boolean(onClick);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={[
        "relative shrink-0 overflow-hidden",
        "rounded-[10px]",
        "border-[2px]",
        "border-[#C7C0B4]",
        "bg-[#F5F1E8]",
        "shadow-[0_3px_0_#AAA398,0_5px_10px_rgba(0,0,0,0.35)]",
        "transition-all duration-150",

        vertical
          ? small
            ? "h-[52px] w-[29px]"
            : "h-[104px] w-[58px]"
          : small
            ? "h-[29px] w-[52px]"
            : "h-[58px] w-[104px]",

        selected
          ? "border-[#FF6B00] ring-2 ring-[#FF6B00]/50 -translate-y-1"
          : playable
            ? "border-[#FF6B00] hover:-translate-y-1"
            : "",

        clickable
          ? "cursor-pointer active:scale-95"
          : "cursor-default",
      ].join(" ")}
    >
      {/* RELIEF DE LA PIÈCE */}
      <div className="pointer-events-none absolute inset-0 rounded-[8px] bg-gradient-to-br from-white via-transparent to-[#D8D2C6]/70" />

      {vertical ? (
        <div className="relative flex h-full w-full flex-col">
          {/* HAUT */}
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <PipFace
              value={tile.a}
              small={small}
            />
          </div>

          {/* SÉPARATION */}
          <div className="mx-1.5 h-[2px] shrink-0 rounded-full bg-[#252525]" />

          {/* BAS */}
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <PipFace
              value={tile.b}
              small={small}
            />
          </div>
        </div>
      ) : (
        <div className="relative flex h-full w-full flex-row">
          {/* GAUCHE */}
          <div className="flex min-w-0 flex-1 items-center justify-center">
            <PipFace
              value={tile.a}
              small={small}
            />
          </div>

          {/* SÉPARATION */}
          <div className="my-1.5 w-[2px] shrink-0 rounded-full bg-[#252525]" />

          {/* DROITE */}
          <div className="flex min-w-0 flex-1 items-center justify-center">
            <PipFace
              value={tile.b}
              small={small}
            />
          </div>
        </div>
      )}
    </button>
  );
}

/* =========================================================
   NORMALISATION
   ========================================================= */

function normalizeDomino(
  value: unknown,
): Domino | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const item =
    value as Record<string, unknown>;

  if (
    typeof item.a !== "number" ||
    typeof item.b !== "number"
  ) {
    return null;
  }

  return {
    a: item.a,
    b: item.b,
  };
}

function normalizeDominos(
  value: unknown,
): Domino[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeDomino)
    .filter(
      (item): item is Domino =>
        item !== null,
    );
}

function normalizeGame(
  value: unknown,
): Game | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const item =
    value as Record<string, unknown>;

  if (
    typeof item.id !== "string" ||
    typeof item.code !== "string"
  ) {
    return null;
  }

  return {
    id: item.id,
    code: item.code,

    status:
      item.status === "playing"
        ? "playing"
        : item.status === "finished"
          ? "finished"
          : "waiting",

    current_player:
      item.current_player === 2
        ? 2
        : 1,

    board: normalizeDominos(
      item.board,
    ),

    boneyard: normalizeDominos(
      item.boneyard,
    ),

    winner:
      item.winner === 1
        ? 1
        : item.winner === 2
          ? 2
          : null,
  };
}

function normalizePlayer(
  value: unknown,
): Player | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const item =
    value as Record<string, unknown>;

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

    player_number:
      item.player_number === 2
        ? 2
        : 1,

    nickname: item.nickname,

    hand: normalizeDominos(
      item.hand,
    ),

    score:
      typeof item.score === "number"
        ? item.score
        : 0,
  };
}

/* =========================================================
   DOMINO SET
   ========================================================= */

function createDominoSet(): Domino[] {
  const result: Domino[] = [];

  for (
    let a = 0;
    a <= 6;
    a += 1
  ) {
    for (
      let b = a;
      b <= 6;
      b += 1
    ) {
      result.push({
        a,
        b,
      });
    }
  }

  return result;
}

function shuffle<T>(
  items: T[],
): T[] {
  const result = [...items];

  for (
    let i = result.length - 1;
    i > 0;
    i -= 1
  ) {
    const j = Math.floor(
      Math.random() * (i + 1),
    );

    const current = result[i];
    const random = result[j];

    if (
      current !== undefined &&
      random !== undefined
    ) {
      result[i] = random;
      result[j] = current;
    }
  }

  return result;
}

/* =========================================================
   RÈGLES
   ========================================================= */

function canPlayLeft(
  tile: Domino,
  board: Domino[],
) {
  if (board.length === 0) {
    return true;
  }

  const first = board[0];

  if (!first) {
    return true;
  }

  return (
    tile.a === first.a ||
    tile.b === first.a
  );
}

function canPlayRight(
  tile: Domino,
  board: Domino[],
) {
  if (board.length === 0) {
    return true;
  }

  const last =
    board[board.length - 1];

  if (!last) {
    return true;
  }

  return (
    tile.a === last.b ||
    tile.b === last.b
  );
}

function orientLeft(
  tile: Domino,
  board: Domino[],
): Domino {
  if (board.length === 0) {
    return tile;
  }

  const first = board[0];

  if (!first) {
    return tile;
  }

  if (tile.b === first.a) {
    return tile;
  }

  return {
    a: tile.b,
    b: tile.a,
  };
}

function orientRight(
  tile: Domino,
  board: Domino[],
): Domino {
  if (board.length === 0) {
    return tile;
  }

  const last =
    board[board.length - 1];

  if (!last) {
    return tile;
  }

  if (tile.a === last.b) {
    return tile;
  }

  return {
    a: tile.b,
    b: tile.a,
  };
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
        ? codeValue[0] ?? ""
        : "";

  const supabase = useMemo(
    () =>
      createSupabaseBrowserClient() as any,
    [],
  );

  const [game, setGame] =
    useState<Game | null>(null);

  const [me, setMe] =
    useState<Player | null>(null);

  const [opponent, setOpponent] =
    useState<Player | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const [selectedTile, setSelectedTile] =
    useState<number | null>(null);

  /* =======================================================
     CHARGEMENT
     ======================================================= */

  const loadGame = useCallback(
    async () => {
      if (!code) {
        return;
      }

      try {
        const session =
          sessionStorage.getItem(
            `qahwa-domino-${code}`,
          );

        if (!session) {
          setError(
            "Session Domino introuvable.",
          );

          setLoading(false);
          return;
        }

        const sessionData =
          JSON.parse(session) as {
            gameId?: string;
            playerNumber?: number;
          };

        if (
          !sessionData.gameId ||
          (
            sessionData.playerNumber !==
              1 &&
            sessionData.playerNumber !==
              2
          )
        ) {
          setError(
            "Session Domino invalide.",
          );

          setLoading(false);
          return;
        }

        const {
          data: gameData,
          error: gameError,
        } = await supabase
          .from("duo_domino_games")
          .select("*")
          .eq(
            "id",
            sessionData.gameId,
          )
          .maybeSingle();

        if (gameError) {
          throw new Error(
            gameError.message,
          );
        }

        const normalizedGame =
          normalizeGame(gameData);

        if (!normalizedGame) {
          setError(
            "Partie introuvable.",
          );

          setLoading(false);
          return;
        }

        setGame(normalizedGame);

        const {
          data: playersData,
          error: playersError,
        } = await supabase
          .from("duo_domino_players")
          .select("*")
          .eq(
            "game_id",
            sessionData.gameId,
          );

        if (playersError) {
          throw new Error(
            playersError.message,
          );
        }

        const players: Player[] =
          [];

        for (
          const item of
          playersData ?? []
        ) {
          const player =
            normalizePlayer(item);

          if (player) {
            players.push(player);
          }
        }

        setMe(
          players.find(
            (player) =>
              player.player_number ===
              sessionData.playerNumber,
          ) ?? null,
        );

        setOpponent(
          players.find(
            (player) =>
              player.player_number !==
              sessionData.playerNumber,
          ) ?? null,
        );

        setLoading(false);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Erreur de chargement.",
        );

        setLoading(false);
      }
    },
    [code, supabase],
  );

  /* =======================================================
     REALTIME
     ======================================================= */

  useEffect(() => {
    void loadGame();

    if (!code) {
      return;
    }

    const channel = supabase
      .channel(`domino-${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "duo_domino_games",
        },
        () => {
          void loadGame();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "duo_domino_players",
        },
        () => {
          void loadGame();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    code,
    loadGame,
    supabase,
  ]);

  /* =======================================================
     DÉMARRER
     ======================================================= */

  async function startGame() {
    if (
      !game ||
      !me ||
      !opponent
    ) {
      return;
    }

    if (
      me.player_number !== 1
    ) {
      return;
    }

    if (
      game.status !== "waiting"
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const tiles = shuffle(
        createDominoSet(),
      );

      const hand1 =
        tiles.slice(0, 7);

      const hand2 =
        tiles.slice(7, 14);

      const boneyard =
        tiles.slice(14);

      const {
        error: p1Error,
      } = await supabase
        .from(
          "duo_domino_players",
        )
        .update({
          hand: hand1,
          score: 0,
        })
        .eq("id", me.id);

      if (p1Error) {
        throw new Error(
          p1Error.message,
        );
      }

      const {
        error: p2Error,
      } = await supabase
        .from(
          "duo_domino_players",
        )
        .update({
          hand: hand2,
          score: 0,
        })
        .eq(
          "id",
          opponent.id,
        );

      if (p2Error) {
        throw new Error(
          p2Error.message,
        );
      }

      const {
        error: gameError,
      } = await supabase
        .from(
          "duo_domino_games",
        )
        .update({
          status: "playing",
          current_player: 1,
          board: [],
          boneyard,
          winner: null,
        })
        .eq("id", game.id);

      if (gameError) {
        throw new Error(
          gameError.message,
        );
      }

      await loadGame();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de démarrer.",
      );
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     JOUER À DROITE
     ======================================================= */

  async function playRight() {
    if (
      !game ||
      !me ||
      selectedTile === null
    ) {
      return;
    }

    if (
      game.status !== "playing" ||
      game.current_player !==
        me.player_number
    ) {
      return;
    }

    const tile =
      me.hand[selectedTile];

    if (!tile) {
      return;
    }

    if (
      !canPlayRight(
        tile,
        game.board,
      )
    ) {
      setError(
        "Ce domino ne correspond pas à droite.",
      );

      return;
    }

    setBusy(true);
    setError("");

    try {
      const played =
        orientRight(
          tile,
          game.board,
        );

      const newBoard = [
        ...game.board,
        played,
      ];

      const newHand =
        me.hand.filter(
          (_item, index) =>
            index !==
            selectedTile,
        );

      const hasWon =
        newHand.length === 0;

      const nextPlayer: PlayerNumber =
        me.player_number === 1
          ? 2
          : 1;

      const {
        error: playerError,
      } = await supabase
        .from(
          "duo_domino_players",
        )
        .update({
          hand: newHand,
        })
        .eq("id", me.id);

      if (playerError) {
        throw new Error(
          playerError.message,
        );
      }

      const {
        error: gameError,
      } = await supabase
        .from(
          "duo_domino_games",
        )
        .update({
          board: newBoard,

          current_player: hasWon
            ? me.player_number
            : nextPlayer,

          status: hasWon
            ? "finished"
            : "playing",

          winner: hasWon
            ? me.player_number
            : null,
        })
        .eq("id", game.id);

      if (gameError) {
        throw new Error(
          gameError.message,
        );
      }

      setSelectedTile(null);

      await loadGame();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de jouer.",
      );
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     JOUER À GAUCHE
     ======================================================= */

  async function playLeft() {
    if (
      !game ||
      !me ||
      selectedTile === null
    ) {
      return;
    }

    if (
      game.status !== "playing" ||
      game.current_player !==
        me.player_number
    ) {
      return;
    }

    const tile =
      me.hand[selectedTile];

    if (!tile) {
      return;
    }

    if (
      !canPlayLeft(
        tile,
        game.board,
      )
    ) {
      setError(
        "Ce domino ne correspond pas à gauche.",
      );

      return;
    }

    setBusy(true);
    setError("");

    try {
      const played =
        orientLeft(
          tile,
          game.board,
        );

      const newBoard = [
        played,
        ...game.board,
      ];

      const newHand =
        me.hand.filter(
          (_item, index) =>
            index !==
            selectedTile,
        );

      const hasWon =
        newHand.length === 0;

      const nextPlayer: PlayerNumber =
        me.player_number === 1
          ? 2
          : 1;

      const {
        error: playerError,
      } = await supabase
        .from(
          "duo_domino_players",
        )
        .update({
          hand: newHand,
        })
        .eq("id", me.id);

      if (playerError) {
        throw new Error(
          playerError.message,
        );
      }

      const {
        error: gameError,
      } = await supabase
        .from(
          "duo_domino_games",
        )
        .update({
          board: newBoard,

          current_player: hasWon
            ? me.player_number
            : nextPlayer,

          status: hasWon
            ? "finished"
            : "playing",

          winner: hasWon
            ? me.player_number
            : null,
        })
        .eq("id", game.id);

      if (gameError) {
        throw new Error(
          gameError.message,
        );
      }

      setSelectedTile(null);

      await loadGame();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de jouer.",
      );
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     PIOCHER
     ======================================================= */

  async function drawTile() {
    if (!game || !me) {
      return;
    }

    if (
      game.status !== "playing" ||
      game.current_player !==
        me.player_number
    ) {
      return;
    }

    if (
      game.boneyard.length === 0
    ) {
      setError(
        "La pioche est vide.",
      );

      return;
    }

    setBusy(true);
    setError("");

    try {
      const tile =
        game.boneyard[0];

      if (!tile) {
        return;
      }

      const newHand = [
        ...me.hand,
        tile,
      ];

      const newBoneyard =
        game.boneyard.slice(1);

      const {
        error: playerError,
      } = await supabase
        .from(
          "duo_domino_players",
        )
        .update({
          hand: newHand,
        })
        .eq("id", me.id);

      if (playerError) {
        throw new Error(
          playerError.message,
        );
      }

      const {
        error: gameError,
      } = await supabase
        .from(
          "duo_domino_games",
        )
        .update({
          boneyard:
            newBoneyard,
        })
        .eq("id", game.id);

      if (gameError) {
        throw new Error(
          gameError.message,
        );
      }

      await loadGame();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de piocher.",
      );
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     PASSER
     ======================================================= */

  async function passTurn() {
    if (!game || !me) {
      return;
    }

    if (
      game.status !== "playing" ||
      game.current_player !==
        me.player_number
    ) {
      return;
    }

    if (
      game.boneyard.length > 0
    ) {
      setError(
        "Tu dois piocher avant de passer.",
      );

      return;
    }

    setBusy(true);
    setError("");

    try {
      const nextPlayer: PlayerNumber =
        me.player_number === 1
          ? 2
          : 1;

      const { error } =
        await supabase
          .from(
            "duo_domino_games",
          )
          .update({
            current_player:
              nextPlayer,
          })
          .eq(
            "id",
            game.id,
          );

      if (error) {
        throw new Error(
          error.message,
        );
      }

      await loadGame();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de passer.",
      );
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     ÉTAT DU JEU
     ======================================================= */

  const myTurn =
    game !== null &&
    me !== null &&
    game.status === "playing" &&
    game.current_player ===
      me.player_number;

  const playableTiles =
    useMemo(() => {
      if (
        !game ||
        !me ||
        !myTurn
      ) {
        return new Set<number>();
      }

      const result =
        new Set<number>();

      me.hand.forEach(
        (tile, index) => {
          if (
            canPlayLeft(
              tile,
              game.board,
            ) ||
            canPlayRight(
              tile,
              game.board,
            )
          ) {
            result.add(index);
          }
        },
      );

      return result;
    }, [game, me, myTurn]);

  const selectedDomino =
    selectedTile !== null && me
      ? me.hand[selectedTile]
      : null;

  /* =======================================================
     LOADING
     ======================================================= */

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#080808] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#FF6B00]/30 bg-[#151515] text-3xl">
            🁣
          </div>

          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#FF6B00]">
            DOMINO
          </p>
        </div>
      </main>
    );
  }

  /* =======================================================
     ERREUR
     ======================================================= */

  if (!game || !me) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#080808] px-5 text-white">
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-6 text-center">
          <p className="text-sm text-white/60">
            {error ||
              "Partie introuvable."}
          </p>
        </div>
      </main>
    );
  }

  /* =======================================================
     INTERFACE
     ======================================================= */

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#080808] text-white">
      <div className="mx-auto flex min-h-[100dvh] max-w-[900px] flex-col px-3 py-3 sm:px-5">

        {/* TOP BAR */}

        <header className="mb-2 flex h-10 shrink-0 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#151515] text-lg">
              🁣
            </div>

            <div>
              <p className="text-sm font-black">
                Domino
              </p>

              <p className="text-[8px] font-bold uppercase tracking-widest text-white/25">
                {me.nickname}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={[
                "h-2 w-2 rounded-full",
                myTurn
                  ? "bg-[#FF6B00] shadow-[0_0_10px_#FF6B00]"
                  : "bg-white/20",
              ].join(" ")}
            />

            <span className="text-[10px] font-black uppercase tracking-wider text-white/40">
              {game.status ===
              "finished"
                ? game.winner ===
                  me.player_number
                  ? "Gagné"
  : "Perdu"
                : myTurn
                  ? "À toi"
                  : "Adversaire"}
            </span>
          </div>
        </header>

        {/* OPPONENT */}

        <div className="mb-2 flex h-9 shrink-0 items-center justify-between rounded-xl border border-white/8 bg-[#111] px-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#1d1d1d] text-[10px] font-black">
              {opponent?.nickname
                ?.charAt(0)
                .toUpperCase() ||
                "?"}
            </div>

            <span className="max-w-[130px] truncate text-xs font-bold">
              {opponent?.nickname ||
                "En attente..."}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {Array.from({
              length: Math.min(
                opponent?.hand.length ??
                  0,
                7,
              ),
            }).map(
              (_, index) => (
                <span
                  key={index}
                  className="h-5 w-2.5 rounded-sm border border-[#FF6B00]/20 bg-[#1c1c1c]"
                />
              ),
            )}

            <span className="ml-1 text-[10px] font-black text-white/30">
              {opponent?.hand.length ??
                0}
            </span>
          </div>
        </div>

        {/* WAITING */}

        {game.status ===
          "waiting" && (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#111] p-7 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#171717] text-4xl">
                🁣
              </div>

              <h1 className="text-2xl font-black">
                {opponent
                  ? "Prêt ?"
                  : "En attente"}
              </h1>

              <p className="mt-2 text-xs leading-5 text-white/30">
                {opponent
                  ? "Le joueur 1 peut lancer la partie."
                  : "Partage le code de la partie avec ton binôme."}
              </p>

              <div className="my-5 rounded-xl bg-[#181818] py-3 font-black tracking-[0.4em]">
                {game.code}
              </div>

              {me.player_number ===
                1 &&
                opponent && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void startGame()
                    }
                    className="w-full rounded-xl bg-[#FF6B00] py-3.5 text-sm font-black text-black transition hover:bg-[#ff7b1a] disabled:opacity-50"
                  >
                    {busy
                      ? "Préparation..."
                      : "COMMENCER"}
                  </button>
                )}
            </div>
          </div>
        )}

        {/* GAME */}

        {game.status !==
          "waiting" && (
          <div className="flex min-h-0 flex-1 flex-col">

            {/* STATUS */}

            <div
              className={[
                "mb-2 flex h-8 shrink-0 items-center justify-center rounded-xl border text-[10px] font-black uppercase tracking-[0.2em]",

                game.status ===
                "finished"
                  ? "border-[#FF6B00]/20 bg-[#FF6B00]/5 text-[#FF6B00]"
                  : myTurn
                    ? "border-[#FF6B00]/20 bg-[#FF6B00]/5 text-[#FF6B00]"
                    : "border-white/5 bg-[#111] text-white/25",
              ].join(" ")}
            >
              {game.status ===
              "finished"
                ? game.winner ===
                  me.player_number
                  ? "🏆 TU AS GAGNÉ"
                  : "TON ADVERSAIRE A GAGNÉ"
                : myTurn
                  ? "● À TOI DE JOUER"
                  : "● TOUR ADVERSE"}
            </div>

            {/* =================================================
                PLATEAU
                ================================================= */}

            <section className="mb-2 flex-none overflow-hidden rounded-2xl border border-white/8 bg-[#101010]">

              <div className="flex h-7 shrink-0 items-center justify-between border-b border-white/5 px-3">
                <span className="text-[8px] font-black uppercase tracking-[0.25em] text-white/20">
                  PLATEAU
                </span>

                <span className="text-[9px] font-black text-white/20">
                  {game.board.length} / 28
                </span>
              </div>

              <div className="w-full bg-[radial-gradient(circle,#1b1b1b_0%,#0b0b0b_75%)] px-1 py-2">
                {game.board.length === 0 ? (
                  <div className="flex h-[150px] w-full items-center justify-center text-[10px] font-bold text-white/15">
                    Premier domino
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    {Array.from(
                      { length: Math.ceil(game.board.length / 6) },
                      (_, rowIndex) => {
                        const row = game.board.slice(
                          rowIndex * 6,
                          rowIndex * 6 + 6,
                        );
                        const goesRight = rowIndex % 2 === 0;
                        return (
                          <div
                            key={`board-row-${rowIndex}`}
                            className={[
                              "flex w-full items-center justify-center",
                              "gap-0",
                              goesRight ? "flex-row" : "flex-row-reverse",
                            ].join(" ")}
                          >
                            {row.map((tile, tileIndex) => {
                              const boardIndex =
                                rowIndex * 6 + tileIndex;

                              return (
                                <div
                                  key={`${boardIndex}-${tile.a}-${tile.b}`}
                                  className="shrink-0"
                                >
                                  <DominoTile
                                    tile={goesRight ? tile : { a: tile.b, b: tile.a }}
                                    small
                                  />
                                </div>
                              );
                            })}
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* SELECTED ACTION */}

            {selectedDomino &&
              myTurn && (
                <div className="mb-2 grid h-10 shrink-0 grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={
                      busy ||
                      !canPlayLeft(
                        selectedDomino,
                        game.board,
                      )
                    }
                    onClick={() =>
                      void playLeft()
                    }
                    className="rounded-xl border border-white/10 bg-[#151515] text-xs font-black transition hover:border-[#FF6B00]/40 disabled:opacity-20"
                  >
                    ← GAUCHE
                  </button>

                  <button
                    type="button"
                    disabled={
                      busy ||
                      !canPlayRight(
                        selectedDomino,
                        game.board,
                      )
                    }
                    onClick={() =>
                      void playRight()
                    }
                    className="rounded-xl bg-[#FF6B00] text-xs font-black text-black transition hover:bg-[#ff7b1a] disabled:opacity-30"
                  >
                    DROITE →
                  </button>
                </div>
              )}

            {/* =================================================
                MAIN
                ================================================= */}

            <section className="mb-2 shrink-0 rounded-2xl border border-white/8 bg-[#111]">

              <div className="flex h-7 items-center justify-between border-b border-white/5 px-3">
                <span className="text-[8px] font-black uppercase tracking-[0.25em] text-white/20">
                  TA MAIN
                </span>

                <span className="text-[9px] font-black text-[#FF6B00]">
                  {me.hand.length} • 🂠{" "}
                  {game.boneyard.length}
                </span>
              </div>

              <div className="flex h-[94px] items-end justify-center gap-1 overflow-x-auto px-2 pb-2">
                {me.hand.map(
                  (
                    tile,
                    index,
                  ) => (
                    <DominoTile
                      key={`${index}-${tile.a}-${tile.b}`}
                      tile={tile}
                      vertical
                      playable={
                        myTurn &&
                        playableTiles.has(
                          index,
                        )
                      }
                      selected={
                        selectedTile ===
                        index
                      }
                      onClick={
                        myTurn &&
                        playableTiles.has(
                          index,
                        )
                          ? () =>
                              setSelectedTile(
                                index,
                              )
                          : undefined
                      }
                    />
                  ),
                )}
              </div>
            </section>

            {/* BUTTONS */}

            {myTurn &&
              game.status ===
                "playing" && (
                <div className="grid h-11 shrink-0 grid-cols-2 gap-2">

                  <button
                    type="button"
                    disabled={
                      busy ||
                      game.boneyard
                        .length ===
                        0
                    }
                    onClick={() =>
                      void drawTile()
                    }
                    className="rounded-xl border border-white/10 bg-[#151515] text-xs font-black transition hover:border-[#FF6B00]/30 hover:bg-[#191919] disabled:opacity-20"
                  >
                    🂠 PIOCHER{" "}
                    <span className="text-white/30">
                      {
                        game
                          .boneyard
                          .length
                      }
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={
                      busy ||
                      game.boneyard
                        .length > 0
                    }
                    onClick={() =>
                      void passTurn()
                    }
                    className="rounded-xl border border-white/10 bg-[#151515] text-xs font-black transition hover:bg-[#191919] disabled:opacity-20"
                  >
                    PASSER
                  </button>
                </div>
              )}

            {!myTurn &&
              game.status ===
                "playing" && (
                <div className="flex h-11 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-[#111] text-[9px] font-black uppercase tracking-widest text-white/20">
                  Tour de{" "}
                  {opponent?.nickname}
                </div>
              )}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="mt-2 shrink-0 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-center text-[10px] font-bold text-red-300">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}