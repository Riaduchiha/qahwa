"use client";

import type { CafeTable, Order } from "@/types/database";
import { findTableOrder, getTableState } from "@/lib/caisse/selectors";
import { TABLE_STATE_STYLES, TableTile } from "./table-tile";

const STATES = ["libre", "reservee", "occupee", "prete", "servie"] as const;

export function FloorPlan({
  tables,
  orders,
  selectedId,
  onSelect,
  onToggleReserved,
}: {
  tables: CafeTable[];
  orders: Order[];
  selectedId: string | null;
  onSelect: (table: CafeTable) => void;
  onToggleReserved: (table: CafeTable) => void;
}) {
  return (
    <section
      aria-label="Plan de salle"
      className="rounded-xl border border-qahwa-border bg-qahwa-panel p-4 shadow-panel"
    >
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-lg uppercase text-qahwa-text">Salle</h2>
        <span className="text-sm text-qahwa-muted">{tables.length} tables</span>
      </div>

      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-qahwa-muted">
        {STATES.map((state) => (
          <li key={state} className="flex items-center gap-2">
            <span
              aria-hidden
              className={`h-3 w-3 rounded-full ${TABLE_STATE_STYLES[state].dot}`}
            />
            {TABLE_STATE_STYLES[state].label}
          </li>
        ))}
      </ul>

      <ul className="grid grid-cols-4 gap-2">
        {tables.map((table) => {
          const order = findTableOrder(orders, table);
          return (
            <li key={table.id}>
              <TableTile
                table={table}
                state={getTableState(table, order)}
                selected={selectedId === table.id}
                onSelect={() => onSelect(table)}
                onToggleReserved={() => onToggleReserved(table)}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}