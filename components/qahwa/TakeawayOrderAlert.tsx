"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface TakeawayOrder {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
}

function playTakeawaySound() {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const now = ctx.currentTime;

  [0, 0.15, 0.3].forEach((delay) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(740, now + delay);
    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + delay);
    osc.stop(now + delay + 0.31);
  });
}

export default function TakeawayOrderAlert() {
  const [orders, setOrders] = useState<TakeawayOrder[]>([]);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel("takeaway-order-alert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const order = payload.new as {
            id: string;
            order_number: string;
            customer_name: string;
            total: number;
            order_type: string;
          };
          if (order.order_type !== "emporter") return;

          setOrders((prev) => [
            {
              id: order.id,
              order_number: order.order_number,
              customer_name: order.customer_name,
              total: order.total,
            },
            ...prev,
          ]);

          try {
            playTakeawaySound();
          } catch {
            // ignore si le navigateur bloque le son
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  function dismiss(id: string) {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }

  if (orders.length === 0) return null;

  return (
    <div className="w-80 max-w-[90vw] space-y-2">
      {orders.map((o) => (
        <div
          key={o.id}
          className="rounded-2xl border border-qahwa-orange/40 bg-qahwa-orange/15 p-4 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-start gap-3">
            <span className="text-xl">🛍️</span>
            <div className="flex-1">
              <p className="mb-1 text-sm font-bold text-white">
                Nouvelle commande a emporter
              </p>
              <p className="text-xs text-white/80">
                {o.order_number} — {o.customer_name}
              </p>
              <p className="text-xs text-white/60">{o.total} DA</p>
            </div>
            <button
              onClick={() => dismiss(o.id)}
              className="text-sm font-bold text-white/70 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}