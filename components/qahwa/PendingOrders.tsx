
"use client";

import { useEffect, useState } from "react";
import type { Order } from "@/types/database";

function formatPrice(price: number) {
  return `${price} DA`;
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
      body: JSON.stringify({
        id,
      }),
    });

    if (!res.ok) {
      console.error(
        "Erreur validation:",
        await res.text()
      );
      await load();
      return;
    }

    setOrders((prev) => prev.filter((order) => order.id !== id));
  }

  if (loading) {
    return (
      <p className="mt-3 text-sm text-qahwa-muted">
        Chargement des commandes...
      </p>
    );
  }

  if (orders.length === 0) {
    return (
      <p className="mt-3 text-sm text-qahwa-muted">
        Aucune commande a valider.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {orders.map((order) => (
        <div
          key={order.id}
          className="flex items-center justify-between rounded-xl border border-qahwa-border bg-qahwa-panel p-3 text-sm shadow-panel"
        >
          <div>
            <span className="font-display text-qahwa-text">
              {order.order_number}
            </span>

            <span className="ml-2 text-qahwa-muted">
              {order.customer_name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-display text-qahwa-text">
              {formatPrice(order.total)}
            </span>

            <button
              onClick={() => validate(order.id)}
              className="rounded-lg border border-qahwa-green bg-qahwa-green/20 px-4 py-1.5 text-xs font-display uppercase text-qahwa-green shadow-panel"
            >
              Valider
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

