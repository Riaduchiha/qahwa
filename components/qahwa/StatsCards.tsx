"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Order } from "@/types/database";

function formatPrice(price: number) {
  return `${price} DA`;
}

export default function StatsCards() {
  const [stats, setStats] = useState({
    todayCount: 0,
    pending: 0,
    preparation: 0,
    revenue: 0,
  });
  const supabaseRef = useRef(createSupabaseBrowserClient());

  useEffect(() => {
    const supabase = supabaseRef.current;
    let active = true;

    async function load() {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", startOfToday.toISOString())
        .returns<Order[]>();

      if (!active) return;
      const orders = data ?? [];
      setStats({
        todayCount: orders.length,
        pending: orders.filter((o) => o.status === "recue").length,
        preparation: orders.filter((o) => o.status === "preparation").length,
        revenue: orders
  .filter((o) => o.status !== "annulee" && o.status !== "refusee")
  .reduce((sum, o) => sum + o.total, 0),
      });
    }

    load();

    const channel = supabase
      .channel(`dashboard-stats-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const cards = [
    { label: "Commandes du jour", value: stats.todayCount },
    { label: "En attente", value: stats.pending },
    { label: "En preparation", value: stats.preparation },
    { label: "Chiffre d'affaires (jour)", value: formatPrice(stats.revenue) },
  ];

  return (
    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-qahwa-border bg-qahwa-panel p-4 shadow-panel"
        >
          <p className="text-xs uppercase text-qahwa-muted">{card.label}</p>
          <p className="mt-2 font-display text-2xl text-qahwa-text">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}