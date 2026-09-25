"use client";

import { useEffect, useState } from "react";
import type { Order } from "@/types/database";

function formatPrice(price: number) {
  return `${price.toLocaleString("fr-FR")} DA`;
}

export default function PendingOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/poste/dashboard-orders", {
        cache: "no-store",
      });

      if (!res.ok) {
        console.error(
          "Erreur Dashboard commandes:",
          await res.text()
        );
        return;
      }

      const data = (await res.json()) as Order[];
      setOrders(data);
    } catch (error) {
      console.error("Erreur chargement commandes:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const interval = setInterval(load, 2000);

    return () => clearInterval(interval);
  }, []);

  async function validate(id: string) {
    const res = await fetch("/api/poste/dashboard-orders", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      console.error(
        "Erreur validation:",
        await res.text()
      );
      await load();
      return;
    }

    setOrders((prev) =>
      prev.filter((order) => order.id !== id)
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[100px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-qahwa-muted">
          <span className="h-2 w-2 animate-pulse rounded-full bg-qahwa-orange" />
          Chargement...
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-qahwa-border px-4 text-center">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-qahwa-green/10 text-qahwa-green">
          ✓
        </div>

        <p className="text-sm font-medium text-qahwa-text">
          Tout est à jour
        </p>

        <p className="mt-1 text-xs text-qahwa-muted">
          Aucune commande à valider.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {orders.map((order) => (
        <div
          key={order.id}
          className="group rounded-2xl border border-qahwa-border bg-qahwa-panel2 p-3.5 transition hover:border-qahwa-orange/30 sm:flex sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-qahwa-orange" />

              <span className="font-display text-sm text-qahwa-text">
                {order.order_number}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="max-w-[180px] truncate text-xs text-qahwa-muted">
                {order.customer_name || "Client"}
              </span>

              <span className="text-qahwa-border">•</span>

              <span className="text-[10px] uppercase tracking-wide text-qahwa-muted">
                Nouvelle commande
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 sm:mt-0 sm:justify-end">
            <span className="font-display text-base text-qahwa-text">
              {formatPrice(order.total)}
            </span>

            <button
              onClick={() => validate(order.id)}
              className="min-h-11 rounded-xl border border-qahwa-green/40 bg-qahwa-green/10 px-5 text-xs font-display uppercase tracking-wide text-qahwa-green transition active:scale-[0.97] hover:bg-qahwa-green/20"
            >
              Valider
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}