"use client";

import { useState } from "react";
import type { CafeTable, Order } from "@/types/database";
import { money } from "@/lib/caisse/format";
import { Modal } from "./ui";

const scrollbar =
  "[scrollbar-width:thin] [scrollbar-color:rgba(255,107,0,0.45)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#FF6B00]/40";

const cancelBtn =
  "min-h-[48px] rounded-xl border border-qahwa-border bg-qahwa-panel2 font-display text-xs uppercase text-qahwa-muted transition hover:text-qahwa-text disabled:opacity-50";

export function ChangeTableDialog({
  tables,
  order,
  fromTableNumber,
  busy,
  onConfirm,
  onClose,
}: {
  tables: CafeTable[];
  order: Order;
  fromTableNumber: number | string;
  busy: boolean;
  onConfirm: (targetTableId: string) => void;
  onClose: () => void;
}) {
  const [targetId, setTargetId] = useState("");

  return (
    <Modal title="Changer de table" onClose={onClose}>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-qahwa-orange/30 bg-qahwa-orange/10 p-3">
        <div>
          <p className="text-[10px] uppercase text-qahwa-orange">Commande à déplacer</p>
          <p className="font-display text-lg text-qahwa-text">Table {fromTableNumber}</p>
          <p className="text-xs text-qahwa-muted">{order.order_number}</p>
        </div>
        <p className="font-display text-lg text-qahwa-orange">{money(order.total)}</p>
      </div>

      <p className="mb-2 mt-4 text-xs uppercase text-qahwa-muted">Tables disponibles</p>

      {tables.length === 0 ? (
        <p className="rounded-xl border border-qahwa-border bg-qahwa-panel2 p-4 text-center text-sm text-qahwa-muted">
          Aucune table disponible pour le moment.
        </p>
      ) : (
        <ul className={`grid max-h-[40vh] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 ${scrollbar}`}>
          {tables.map((table) => {
            const selected = targetId === table.id;
            return (
              <li key={table.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  disabled={busy}
                  onClick={() => setTargetId(table.id)}
                  className={`relative flex aspect-square w-full flex-col items-center justify-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qahwa-orange ${
                    selected
                      ? "border-qahwa-orange bg-qahwa-orange/20 ring-2 ring-qahwa-orange/40"
                      : "border-qahwa-border bg-qahwa-panel2 hover:border-qahwa-orange/60"
                  }`}
                >
                  {selected && (
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-qahwa-orange text-xs font-bold text-black">
                      ✓
                    </span>
                  )}
                  <span className="text-[9px] uppercase text-qahwa-muted">Table</span>
                  <span className="font-display text-2xl text-qahwa-text">{table.number}</span>
                  <span className={`mt-1 h-2 w-2 rounded-full ${selected ? "bg-qahwa-orange" : "bg-qahwa-green"}`} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={onClose} disabled={busy} className={cancelBtn}>
          Annuler
        </button>
        <button
          type="button"
          disabled={!targetId || busy}
          onClick={() => onConfirm(targetId)}
          className="min-h-[48px] rounded-xl border border-qahwa-orange bg-qahwa-orange font-display text-xs uppercase text-qahwa-noir shadow-panel transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continuer
        </button>
      </div>
    </Modal>
  );
}

export function MergeDialog({
  current,
  candidates,
  busy,
  onConfirm,
  onClose,
}: {
  current: Order;
  candidates: Order[];
  busy: boolean;
  onConfirm: (other: Order) => void;
  onClose: () => void;
}) {
  const [otherId, setOtherId] = useState("");
  const other = candidates.find((order) => order.id === otherId);

  return (
    <Modal title="Fusionner les tables" onClose={onClose}>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-violet-400/30 bg-violet-500/10 p-3">
        <div>
          <p className="text-[10px] uppercase text-violet-300">Première table</p>
          <p className="font-display text-lg text-qahwa-text">Table {current.table_number}</p>
          <p className="text-xs text-qahwa-muted">{current.order_number}</p>
        </div>
        <p className="font-display text-lg text-violet-300">{money(current.total)}</p>
      </div>

      <p className="mb-2 mt-4 text-xs uppercase text-qahwa-muted">Choisis la deuxième table</p>

      {candidates.length === 0 ? (
        <p className="rounded-xl border border-qahwa-border bg-qahwa-panel2 p-4 text-center text-sm text-qahwa-muted">
          Aucune autre table occupée à encaisser avec celle-ci.
        </p>
      ) : (
        <ul className={`grid max-h-[36vh] grid-cols-2 gap-2 overflow-y-auto pr-1 ${scrollbar}`}>
          {candidates.map((order) => {
            const selected = otherId === order.id;
            return (
              <li key={order.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  disabled={busy}
                  onClick={() => setOtherId(order.id)}
                  className={`relative w-full rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                    selected
                      ? "border-violet-300 bg-violet-500/20 ring-2 ring-violet-400/40"
                      : "border-qahwa-border bg-qahwa-panel2 hover:border-violet-400/60"
                  }`}
                >
                  {selected && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-violet-400 text-xs font-bold text-black">
                      ✓
                    </span>
                  )}
                  <p className="text-[10px] uppercase text-qahwa-muted">Table</p>
                  <p className="font-display text-2xl text-qahwa-text">{order.table_number}</p>
                  <p className="mt-1 truncate text-[10px] text-qahwa-muted">{order.order_number}</p>
                  <p className="font-display text-sm text-violet-300">{money(order.total)}</p>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex items-center justify-between rounded-xl border border-qahwa-border bg-qahwa-panel2 p-3 text-sm">
        <span className="text-qahwa-muted">Total des deux commandes</span>
        <span className="font-display text-lg text-qahwa-text">
          {money(Number(current.total) + Number(other?.total ?? 0))}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={onClose} disabled={busy} className={cancelBtn}>
          Annuler
        </button>
        <button
          type="button"
          disabled={!other || busy}
          onClick={() => other && onConfirm(other)}
          className="min-h-[48px] rounded-xl border border-violet-400 bg-violet-500 font-display text-xs uppercase text-white shadow-panel transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continuer
        </button>
      </div>
    </Modal>
  );
}