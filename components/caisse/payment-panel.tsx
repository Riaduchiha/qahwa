"use client";

import { useState } from "react";
import type { Order, OrderItem } from "@/types/database";
import { STATUS_LABELS } from "@/lib/caisse/constants";
import { money } from "@/lib/caisse/format";
import { PanelHeader } from "./ui";

const scrollbar =
  "[scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.3)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/25 hover:[&::-webkit-scrollbar-thumb]:bg-white/50";

const QUICK_NOTES = [200, 500, 1000, 2000];
const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "C", "0", "00"];

// Une couleur propre à chaque statut.
const STEPS = [
  {
    key: "recue",
    label: "Reçue",
    solid: "border-[#FF6B00] bg-[#FF6B00] text-black",
    soft: "border-[#FF6B00] bg-[#FF6B00]/20 text-[#FF6B00]",
    text: "text-[#FF6B00]",
    line: "bg-[#FF6B00]",
  },
  {
    key: "preparation",
    label: "Préparation",
    solid: "border-amber-400 bg-amber-400 text-black",
    soft: "border-amber-400 bg-amber-400/20 text-amber-400",
    text: "text-amber-400",
    line: "bg-amber-400",
  },
  {
    key: "prete",
    label: "Prête",
    solid: "border-blue-400 bg-blue-400 text-black",
    soft: "border-blue-400 bg-blue-400/20 text-blue-400",
    text: "text-blue-400",
    line: "bg-blue-400",
  },
  {
    key: "servi",
    label: "Servie",
    solid: "border-cyan-400 bg-cyan-400 text-black",
    soft: "border-cyan-400 bg-cyan-400/20 text-cyan-400",
    text: "text-cyan-400",
    line: "bg-cyan-400",
  },
] as const;

const keyClass =
  "min-h-[64px] rounded-xl border border-qahwa-border bg-qahwa-panel2 font-display text-2xl text-qahwa-text transition active:scale-95 hover:border-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

const chipClass =
  "min-h-[42px] flex-1 rounded-lg border border-qahwa-border px-2 font-display text-xs uppercase text-qahwa-muted transition hover:border-white/60 hover:text-qahwa-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

const tileBtn =
  "flex min-h-[52px] items-center justify-center rounded-xl border px-3 text-center font-display text-xs uppercase transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-40";

export function PaymentPanel({
  order,
  tableNumber,
  items,
  itemsLoading,
  itemsFailed,
  busy,
  onPay,
  onServe,
  onPrint,
  onChangeTable,
  onMerge,
  onClose,
}: {
  order: Order;
  tableNumber: number | string;
  items: OrderItem[];
  itemsLoading: boolean;
  itemsFailed: boolean;
  busy: boolean;
  onPay: () => void;
  onServe: () => void;
  onPrint: () => void;
  onChangeTable: () => void;
  onMerge: () => void;
  onClose: () => void;
}) {
  const [amountReceived, setAmountReceived] = useState("");

  const total = Number(order.total ?? 0);
  const received = Number.parseFloat(amountReceived.replace(",", ".")) || 0;
  const change = received - total;
  const missing = amountReceived !== "" && change < 0;
  const canPay = !busy && !missing && !order.paid;
  const stepIndex = STEPS.findIndex((step) => step.key === order.status);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  function pressKey(key: string) {
    setAmountReceived((current) => {
      if (key === "C") return "";
      if (current === "" || current === "0") return key === "00" ? "" : key;
      return current + key;
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title={`Table ${tableNumber}`}
        subtitle={`${order.order_number} · ${STATUS_LABELS[order.status] ?? order.status}`}
        onClose={onClose}
      />

      <div className="grid min-h-0 flex-1 lg:grid-cols-2">
        {/* GAUCHE : commande */}
        <section
          aria-label="Commande"
          className={`flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto p-5 ${scrollbar}`}
        >
          {stepIndex >= 0 && (
            <ol aria-label="Avancement de la commande" className="flex items-start">
              {STEPS.map((step, index) => {
                const done = index < stepIndex;
                const current = index === stepIndex;
                return (
                  <li key={step.key} className="flex flex-1 items-start last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold ${
                          current
                            ? step.solid
                            : done
                              ? step.soft
                              : "border-qahwa-border text-qahwa-muted"
                        }`}
                      >
                        {done ? "✓" : index + 1}
                      </span>
                      <span
                        className={`text-[10px] uppercase ${
                          current
                            ? `${step.text} font-bold`
                            : done
                              ? step.text
                              : "text-qahwa-muted"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <span
                        aria-hidden
                        className={`mx-2 mt-3 h-px flex-1 ${done ? step.line : "bg-qahwa-border"}`}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          <div className="rounded-xl border border-qahwa-border bg-qahwa-panel2">
            <div className="flex items-center justify-between gap-3 border-b border-qahwa-border px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-display text-sm uppercase text-qahwa-text">
                  {order.customer_name || "Client"}
                </p>
                {order.customer_phone && order.customer_phone !== "-" && (
                  <p className="text-xs text-qahwa-muted">{order.customer_phone}</p>
                )}
              </div>
              <span className="shrink-0 text-xs uppercase text-qahwa-muted">
                {itemCount} article{itemCount > 1 ? "s" : ""}
              </span>
            </div>

            <div className="px-4">
              {itemsLoading && <p className="py-3 text-sm text-qahwa-muted">Chargement des articles...</p>}
              {itemsFailed && (
                <p role="alert" className="py-3 text-sm text-qahwa-rouge">
                  Impossible de charger les articles. Ferme puis rouvre la table.
                </p>
              )}
              <ul className="divide-y divide-qahwa-border/60">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-7 min-w-7 items-center justify-center rounded-md bg-qahwa-orange/15 px-1.5 font-display text-xs text-qahwa-orange">
                        {item.quantity}×
                      </span>
                      <span className="truncate text-sm text-qahwa-text">{item.product_name}</span>
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-white">
                      {money(item.line_total)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-baseline justify-between border-t border-qahwa-border px-4 py-3">
              <span className="font-display text-xs uppercase text-qahwa-muted">Total</span>
              <span className="font-display text-2xl text-white">{money(total)}</span>
            </div>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onServe}
              disabled={busy || order.status !== "prete"}
              className={`${tileBtn} col-span-2 border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/10 focus-visible:ring-cyan-400`}
            >
              {order.status === "servi"
                ? "Déjà servie"
                : order.status === "prete"
                  ? "Marquer servie"
                  : "En attente de préparation"}
            </button>
            <button
              type="button"
              onClick={onChangeTable}
              disabled={busy || order.paid}
              className={`${tileBtn} border-qahwa-border bg-qahwa-panel text-qahwa-text hover:border-white/60 focus-visible:ring-white`}
            >
              Changer de table
            </button>
            <button
              type="button"
              onClick={onMerge}
              disabled={busy || order.paid}
              className={`${tileBtn} border-violet-400/50 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 focus-visible:ring-violet-400`}
            >
              Fusionner
            </button>
            <button
              type="button"
              onClick={onPrint}
              className={`${tileBtn} col-span-2 border-qahwa-border bg-qahwa-panel text-qahwa-text hover:border-white/60 focus-visible:ring-white`}
            >
              Imprimer le ticket
            </button>
          </div>
        </section>

        {/* DROITE : paiement */}
        <section
          aria-label="Encaissement"
          className={`flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto border-t border-qahwa-border bg-black/20 p-5 lg:border-l lg:border-t-0 ${scrollbar}`}
        >
          <div className="overflow-hidden rounded-xl border border-qahwa-border bg-qahwa-panel2">
            <div className="flex items-baseline justify-between gap-3 px-4 py-3">
              <span className="font-display text-xs uppercase text-qahwa-muted">À encaisser</span>
              <span className="font-display text-4xl text-white">{money(total)}</span>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-qahwa-border px-4 py-2">
              <label htmlFor="amount-received" className="font-display text-xs uppercase text-qahwa-muted">
                Reçu
              </label>
              <div className="flex min-w-0 items-center gap-2">
                <input
                  id="amount-received"
                  inputMode="decimal"
                  value={amountReceived}
                  onChange={(event) => setAmountReceived(event.target.value.replace(/[^0-9.,]/g, ""))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && canPay) onPay();
                  }}
                  placeholder="0"
                  className="w-full min-w-0 bg-transparent text-right font-display text-4xl text-qahwa-text outline-none placeholder:text-qahwa-muted/40"
                />
                <button
                  type="button"
                  aria-label="Effacer le dernier chiffre"
                  onClick={() => setAmountReceived((current) => current.slice(0, -1))}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-qahwa-border text-qahwa-muted transition hover:border-white/60 hover:text-qahwa-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  ⌫
                </button>
              </div>
            </div>

            <div
              role="status"
              className={`flex items-baseline justify-between gap-3 border-t border-qahwa-border px-4 py-3 ${
                amountReceived === ""
                  ? ""
                  : missing
                    ? "bg-qahwa-rouge/10"
                    : "bg-qahwa-green/10"
              }`}
            >
              <span className="font-display text-xs uppercase text-qahwa-muted">
                {missing ? "Il manque" : "À rendre"}
              </span>
              <span
                className={`font-display text-3xl ${
                  amountReceived === ""
                    ? "text-qahwa-muted/40"
                    : missing
                      ? "text-qahwa-rouge"
                      : "text-qahwa-green"
                }`}
              >
                {amountReceived === "" ? "—" : money(Math.abs(change))}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setAmountReceived(String(total))} className={chipClass}>
              Exact
            </button>
            {QUICK_NOTES.map((note) => (
              <button
                key={note}
                type="button"
                onClick={() => setAmountReceived(String(received + note))}
                className={chipClass}
              >
                +{note}
              </button>
            ))}
          </div>

          <div className="grid flex-1 grid-cols-3 gap-2">
            {KEYS.map((key) => (
              <button
                key={key}
                type="button"
                aria-label={key === "C" ? "Tout effacer" : key}
                onClick={() => pressKey(key)}
                className={`${keyClass} ${key === "C" ? "text-qahwa-muted" : ""}`}
              >
                {key}
              </button>
            ))}
          </div>
        </section>
      </div>

      <footer className="border-t border-qahwa-border p-4">
        <button
          type="button"
          onClick={onPay}
          disabled={!canPay}
          className="min-h-[56px] w-full rounded-xl border border-white bg-white font-display text-sm uppercase text-qahwa-noir shadow-panel transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-qahwa-panel disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Traitement..." : `Encaisser ${money(total)}`}
        </button>
      </footer>
    </div>
  );
}