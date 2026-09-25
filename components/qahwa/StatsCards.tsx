"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Order } from "@/types/database";

function formatPrice(price: number) {
  return `${price.toLocaleString("fr-FR")} DA`;
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
          .filter(
            (o) =>
              o.status !== "annulee" &&
              o.status !== "refusee"
          )
          .reduce((sum, o) => sum + o.total, 0),
      });
    }

    load();

    const channel = supabase
      .channel(
        `dashboard-stats-${Math.random()
          .toString(36)
          .slice(2)}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        load
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr_1fr_1fr]">
      {/* CA - BLOC PRINCIPAL */}
      <div className="group relative overflow-hidden rounded-2xl border border-qahwa-orange/30 bg-gradient-to-br from-qahwa-orange/[0.13] via-qahwa-panel to-qahwa-panel p-5 shadow-panel transition duration-300 hover:border-qahwa-orange/60">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-qahwa-orange/10 blur-3xl transition duration-500 group-hover:bg-qahwa-orange/20" />

        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-qahwa-muted">
                Chiffre d'affaires
              </p>

              <p className="mt-1 text-[11px] uppercase tracking-wide text-qahwa-muted/70">
                Aujourd'hui
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-qahwa-orange/20 bg-qahwa-orange/10">
              <span className="text-sm text-qahwa-orange">
                DA
              </span>
            </div>
          </div>

          <div className="mt-7">
            <p className="font-display text-3xl tracking-tight text-qahwa-text md:text-4xl">
              {formatPrice(stats.revenue)}
            </p>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-qahwa-green" />

            <span className="text-[10px] uppercase tracking-[0.14em] text-qahwa-muted">
              Activité en direct
            </span>
          </div>
        </div>
      </div>

      {/* COMMANDES */}
      <div className="group relative overflow-hidden rounded-2xl border border-qahwa-border bg-qahwa-panel p-5 shadow-panel transition duration-300 hover:border-qahwa-border/80">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-qahwa-muted">
              Commandes
            </p>

            <p className="mt-1 text-[10px] uppercase tracking-wide text-qahwa-muted/60">
              Aujourd'hui
            </p>
          </div>

          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-qahwa-panel2 text-sm text-qahwa-muted">
            #
          </span>
        </div>

        <p className="mt-7 font-display text-3xl text-qahwa-text">
          {stats.todayCount}
        </p>

        <div className="mt-4 h-px bg-qahwa-border" />

        <p className="mt-3 text-[10px] uppercase tracking-wide text-qahwa-muted">
          Total reçu
        </p>
      </div>

      {/* EN ATTENTE */}
      <div className="group relative overflow-hidden rounded-2xl border border-qahwa-border bg-qahwa-panel p-5 shadow-panel transition duration-300 hover:border-qahwa-orange/40">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-qahwa-muted">
              En attente
            </p>

            <p className="mt-1 text-[10px] uppercase tracking-wide text-qahwa-muted/60">
              À valider
            </p>
          </div>

          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${
              stats.pending > 0
                ? "bg-qahwa-orange/10 text-qahwa-orange"
                : "bg-qahwa-panel2 text-qahwa-muted"
            }`}
          >
            !
          </span>
        </div>

        <p
          className={`mt-7 font-display text-3xl ${
            stats.pending > 0
              ? "text-qahwa-orange"
              : "text-qahwa-text"
          }`}
        >
          {stats.pending}
        </p>

        <div className="mt-4 h-px bg-qahwa-border" />

        <p className="mt-3 text-[10px] uppercase tracking-wide text-qahwa-muted">
          Commandes reçues
        </p>
      </div>

      {/* PRÉPARATION */}
      <div className="group relative overflow-hidden rounded-2xl border border-qahwa-border bg-qahwa-panel p-5 shadow-panel transition duration-300 hover:border-qahwa-green/30">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-qahwa-muted">
              Préparation
            </p>

            <p className="mt-1 text-[10px] uppercase tracking-wide text-qahwa-muted/60">
              En cours
            </p>
          </div>

          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${
              stats.preparation > 0
                ? "bg-qahwa-green/10 text-qahwa-green"
                : "bg-qahwa-panel2 text-qahwa-muted"
            }`}
          >
            ◌
          </span>
        </div>

        <p className="mt-7 font-display text-3xl text-qahwa-text">
          {stats.preparation}
        </p>

        <div className="mt-4 h-px bg-qahwa-border" />

        <p className="mt-3 text-[10px] uppercase tracking-wide text-qahwa-muted">
          Commandes en cours
        </p>
      </div>
    </div>
  );
}