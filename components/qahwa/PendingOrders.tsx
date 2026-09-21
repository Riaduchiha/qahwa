"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Order } from "@/types/database";

function formatPrice(price: number) {
  return `${price} DA`;
}

export default function PendingOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  async function load() {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "recue")
      .neq("order_type", "sur_place")
      .order("created_at", { ascending: true })
      .returns<Order[]>();
    setOrders(data ?? []);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("dashboard-pending")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function validate(id: string) {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    await supabase.from("orders").update({ status: "preparation" } as never).eq("id", id);
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
