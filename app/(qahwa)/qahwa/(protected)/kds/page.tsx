"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Order, OrderItem, Station } from "@/types/database";

const STATIONS: { value: Station | "tous"; label: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "barista", label: "Barista" },
  { value: "bar", label: "Bar" },
  { value: "cuisine", label: "Cuisine" },
];

type OrderWithItems = Order & { order_items: OrderItem[] };

function elapsedLabel(createdAt: string) {
  const minutes = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 60000
  );
  if (minutes < 1) return "A l'instant";
  return `il y a ${minutes} min`;
}

export default function KdsPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [station, setStation] = useState<Station | "tous">("tous");
  const [, forceTick] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadOrders() {
    const { data: activeOrders } = await supabase
      .from("orders")
      .select("*")
      .or("status.eq.preparation,and(status.eq.recue,order_type.eq.sur_place)")
      .order("created_at", { ascending: true })
      .returns<Order[]>();

    if (!activeOrders) return;

    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .in(
        "order_id",
        activeOrders.map((o) => o.id)
      )
      .returns<OrderItem[]>();

    setOrders(
      activeOrders.map((order) => ({
        ...order,
        order_items: (items ?? []).filter((i) => i.order_id === order.id),
      }))
    );
  }

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel("kds-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        () => {
          audioRef.current?.play().catch(() => {});
          loadOrders();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => loadOrders()
      )
      .on(
  "postgres_changes",
  { event: "UPDATE", schema: "public", table: "orders" },
  (payload) => {
    const before = payload.old as { status?: string };
    const after = payload.new as { status?: string };
    if (before.status !== "preparation" && after.status === "preparation") {
      audioRef.current?.play().catch(() => {});
    }
    loadOrders();
  }
)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

   async function markReady(item: OrderItem) {
    const res = await fetch("/api/poste/mark-ready", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: item.id }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      alert("Erreur : " + error);
      return;
    }

    loadOrders();
  }

  const filteredOrders = orders
    .map((order) => ({
      ...order,
      order_items:
        station === "tous"
          ? order.order_items
          : order.order_items.filter((i) => i.station === station),
    }))
    .filter((order) => order.order_items.length > 0);

  return (
    <div className="min-h-screen bg-qahwa-bg p-4">
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-qahwa-text">
          Barista Display
        </h1>
        <div className="flex gap-2">
          {STATIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStation(s.value)}
              className={`rounded-lg px-4 py-2 text-sm font-display uppercase ${
                station === s.value
                  ? "border border-qahwa-orange bg-qahwa-orange text-qahwa-noir shadow-panel"
                  : "border border-qahwa-border bg-qahwa-panel2 text-qahwa-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <p className="mt-20 text-center text-qahwa-muted">
          Aucune commande en cours.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => {
            const allReady = order.order_items.every(
              (i) => i.status === "ready"
            );
            return (
              <div
                key={order.id}
                className={`rounded-qahwa border bg-qahwa-panel p-4 shadow-panel ${
                  allReady ? "border-qahwa-green/60" : "border-qahwa-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl text-qahwa-text">
                    {order.table_number
                      ? `Table ${order.table_number}`
                      : order.order_number}
                  </span>
                  <span className="text-sm text-qahwa-muted">
                    {elapsedLabel(order.created_at)}
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  {order.order_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-base text-qahwa-text">
                        {item.quantity} x {item.product_name}
                      </span>
                      {item.status === "ready" ? (
                        <span className="rounded-lg border border-qahwa-green/40 bg-qahwa-green/15 px-4 py-2 text-sm font-display text-qahwa-green">
                          Pret
                        </span>
                      ) : (
                        <button
                          onClick={() => markReady(item)}
                          className="rounded-lg bg-qahwa-green px-5 py-2.5 text-sm font-display text-qahwa-noir active:scale-95"
                        >
                          Marquer pret
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
