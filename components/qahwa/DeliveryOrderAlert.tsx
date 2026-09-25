
"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface DeliveryOrder {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
}

function playDeliverySound() {
  const ctx = new (window.AudioContext ||
    (window as any).webkitAudioContext)();
  const now = ctx.currentTime;

  [0, 0.15, 0.3].forEach((delay) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(740, now + delay);

    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      now + delay + 0.3
    );

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + delay);
    osc.stop(now + delay + 0.31);
  });
}

export default function DeliveryOrderAlert() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);

  const supabase = useMemo(
    () => createSupabaseBrowserClient(),
    []
  );

  useEffect(() => {
    const channel = supabase
      .channel("delivery-order-alert")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const order = payload.new as {
            id: string;
            order_number: string;
            customer_name: string;
            total: number;
            order_type: string;
          };

          if (order.order_type !== "livraison") return;

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
            playDeliverySound();
          } catch {
            // Le navigateur peut bloquer le son.
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
    <div className="w-[calc(100vw-24px)] max-w-[360px] space-y-2">
      {orders.map((o) => (
        <div
          key={o.id}
          className="overflow-hidden rounded-[20px] border border-white/20 bg-transparent shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[32px] backdrop-saturate-[180%]"
        >
          <div className="h-[2px] bg-purple-400/70" />

          <div className="flex items-center gap-3 px-3.5 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-400/15">
              <span className="text-xl">🛵</span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold tracking-tight text-white">
                Nouvelle commande livraison
              </p>

              <p className="mt-0.5 truncate text-[11px] text-white/60">
                {o.order_number} · {o.customer_name}
              </p>

              <p className="mt-0.5 text-[11px] font-medium text-white/45">
                {o.total} DA
              </p>
            </div>

            <button
              type="button"
              onClick={() => dismiss(o.id)}
              aria-label="Fermer"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[15px] text-white/55 transition hover:bg-white/20 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

