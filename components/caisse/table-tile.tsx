"use client";

import type { CafeTable } from "@/types/database";
import type { TableState } from "@/lib/caisse/selectors";

const STYLES: Record<TableState, { label: string; card: string; dot: string }> = {
  libre: {
    label: "Vide",
    card: "border-qahwa-border bg-qahwa-panel text-qahwa-text hover:border-qahwa-green/50",
    dot: "bg-qahwa-green",
  },
  reservee: {
    label: "Réservée",
    card: "border-qahwa-rouge/50 bg-qahwa-rouge/10 text-qahwa-text animate-qahwa-blink",
    dot: "bg-qahwa-rouge",
  },
  occupee: {
    label: "Attend sa commande",
    card: "border-qahwa-orange/60 bg-qahwa-orange/10 text-qahwa-text animate-qahwa-blink",
    dot: "bg-qahwa-orange",
  },
  prete: {
    label: "Prête à servir",
    card: "border-blue-400/60 bg-blue-400/10 text-qahwa-text animate-qahwa-blink",
    dot: "bg-blue-400",
  },
  servie: {
    label: "Servie",
    card: "border-cyan-400/40 bg-cyan-400/5 text-qahwa-text",
    dot: "bg-cyan-400",
  },
};

export const TABLE_STATE_STYLES = STYLES;

export function TableTile({
  table,
  state,
  selected,
  onSelect,
  onToggleReserved,
}: {
  table: CafeTable;
  state: TableState;
  amount?: number | null;
  selected: boolean;
  onSelect: () => void;
  onToggleReserved: () => void;
}) {
  const style = STYLES[state];
  const canReserve = state === "libre" || state === "reservee";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Table ${table.number}, ${style.label}`}
        className={`flex aspect-square w-full min-w-0 flex-col items-center justify-center rounded-xl border shadow-panel transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${style.card} ${
          selected ? "ring-2 ring-white" : ""
        }`}
      >
        <span className="font-display text-lg leading-none sm:text-xl">
          {table.number}
        </span>
        <span
          className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
          aria-hidden
        />
        <span className="mt-2 w-full px-1 text-center text-[8px] font-medium uppercase leading-[1.15] text-qahwa-muted sm:text-[10px]">
          {style.label}
        </span>
      </button>

      {canReserve && (
        <button
          type="button"
          onClick={onToggleReserved}
          title={state === "reservee" ? "Annuler la réservation" : "Réserver la table"}
          aria-label={
            state === "reservee"
              ? `Annuler la réservation de la table ${table.number}`
              : `Réserver la table ${table.number}`
          }
          className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center"
        >
          <span className="h-3.5 w-3.5 rounded-full border border-qahwa-border bg-qahwa-rouge/40" />
        </button>
      )}
    </div>
  );
}