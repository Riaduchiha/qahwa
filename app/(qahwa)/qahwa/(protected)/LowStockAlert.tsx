"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Ingredient = {
  id: string;
  name: string;
  quantity_in_stock: number;
  unit: string;
  alert_threshold: number;
};

function playAlertSound() {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

  if (!AudioContextClass) return;

  const ctx = new AudioContextClass();
  const now = ctx.currentTime;

  [0, 0.18].forEach((delay) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now + delay);

    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(0.1, now + delay + 0.02);
    gain.gain.linearRampToValueAtTime(0, now + delay + 0.14);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now + delay);
    oscillator.stop(now + delay + 0.15);
  });

  setTimeout(() => void ctx.close(), 500);
}

export default function LowStockAlert() {
  const [lowStock, setLowStock] = useState<Ingredient[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  const hasPlayedSound = useRef(false);

  const supabase = useMemo(
    () => createSupabaseBrowserClient(),
    []
  );

  useEffect(() => {
    async function check() {
      const { data } = await supabase
        .from("ingredients")
        .select("*");

      const low = (data ?? []).filter(
        (ingredient: Ingredient) =>
          ingredient.quantity_in_stock <= ingredient.alert_threshold
      );

      setLowStock(low);

      if (low.length > 0 && !hasPlayedSound.current) {
        hasPlayedSound.current = true;

        try {
          playAlertSound();
        } catch {}
      }

      if (low.length === 0) {
        hasPlayedSound.current = false;
        setDismissed(false);
      }
    }

    check();

    const channel = supabase
      .channel("low-stock-alert")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ingredients",
        },
        check
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    if (lowStock.length > 0 && !dismissed) {
      const timer = setTimeout(() => setVisible(true), 80);

      return () => clearTimeout(timer);
    }

    setVisible(false);
  }, [lowStock, dismissed]);

  if (dismissed || lowStock.length === 0) {
    return null;
  }

  const firstThree = lowStock.slice(0, 3);
  const extraCount = lowStock.length - 3;

  return (
    <div
      className={`w-[calc(100vw-24px)] max-w-[360px] overflow-hidden rounded-[20px] border border-white/20 bg-transparent shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[32px] backdrop-saturate-[180%] transition-all duration-500 ${
        visible
          ? "translate-y-0 scale-100 opacity-100"
          : "-translate-y-3 scale-[0.96] opacity-0"
      }`}
    >
      {/* Petite ligne rouge supérieure */}
      <div className="h-[2px] bg-red-500/90" />

      <div className="flex items-start gap-3 px-3.5 py-3">
        {/* Icône */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15">
          <svg
            viewBox="0 0 24 24"
            className="h-[19px] w-[19px] text-red-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </div>

        {/* Contenu */}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold tracking-tight text-white">
            Stock faible
          </p>

          <div className="mt-1.5 space-y-2">
            {firstThree.map((ingredient) => {
              const percentage =
                ingredient.alert_threshold > 0
                  ? Math.min(
                      100,
                      (ingredient.quantity_in_stock /
                        (ingredient.alert_threshold * 3)) *
                        100
                    )
                  : 0;

              return (
                <div
                  key={ingredient.id}
                  className="space-y-1"
                >
                  <p className="truncate text-[12px] text-red-400">
                    {ingredient.name} ·{" "}
                    {ingredient.quantity_in_stock}
                    {ingredient.unit}
                  </p>

                  {/* Barre de quantité */}
                  <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-red-500/80 transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {extraCount > 0 && (
              <p className="text-[11px] text-white/45">
                +{extraCount} autre
                {extraCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {/* Fermer */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Fermer"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[15px] text-white/55 transition hover:bg-white/20 hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}