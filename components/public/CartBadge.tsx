
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/store/cart";

export default function CartBadge() {
  const [mounted, setMounted] = useState(false);
  const [animate, setAnimate] = useState(false);

  const totalItems = useCartStore((state) => state.totalItems());
  const totalPrice = useCartStore((state) => state.totalPrice());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || totalItems === 0) return;

    setAnimate(true);

    const timer = window.setTimeout(() => {
      setAnimate(false);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [totalItems, mounted]);

  const formattedTotal = `${totalPrice.toLocaleString("fr-FR")} DA`;

  return (
    <Link
      href="/commander"
      aria-label={
        mounted && totalItems > 0
          ? `Panier, ${totalItems} article${totalItems > 1 ? "s" : ""}, ${formattedTotal}`
          : "Panier vide"
      }
      className="group relative flex items-center"
    >
      <span
        className={`relative flex h-11 items-center gap-2 rounded-full border px-3 transition-all duration-300 ${
          mounted && totalItems > 0
            ? "border-qahwa-blanc/15 bg-qahwa-blanc/[0.05] text-qahwa-blanc hover:border-qahwa-orange/40 hover:bg-qahwa-blanc/[0.08]"
            : "border-transparent text-qahwa-blanc/70 hover:text-qahwa-blanc"
        } ${animate ? "qahwa-cart-bounce" : ""}`}
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-qahwa-blanc/[0.06] text-lg transition-all duration-300 group-hover:bg-qahwa-orange group-hover:text-qahwa-noir">
          <span aria-hidden>🛒</span>

          {mounted && totalItems > 0 && (
            <span
              className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-qahwa-orange px-1 text-[10px] font-display text-qahwa-noir ${
                animate ? "qahwa-cart-count" : ""
              }`}
            >
              {totalItems}
            </span>
          )}
        </span>

        {mounted && totalItems > 0 && (
          <span className="hidden text-left sm:block">
            <span className="block text-[9px] uppercase tracking-[0.16em] text-qahwa-blanc/35">
              Panier
            </span>

            <span className="block font-display text-xs text-qahwa-blanc">
              {formattedTotal}
            </span>
          </span>
        )}

        {mounted && totalItems > 0 && (
          <span className="hidden text-qahwa-blanc/25 transition-transform duration-300 group-hover:translate-x-0.5 sm:block">
            →
          </span>
        )}
      </span>

      <style jsx>{`
        @keyframes qahwa-cart-bounce {
          0% {
            transform: scale(1);
          }

          25% {
            transform: scale(0.94) rotate(-2deg);
          }

          50% {
            transform: scale(1.06) rotate(2deg);
          }

          75% {
            transform: scale(0.98) rotate(-1deg);
          }

          100% {
            transform: scale(1) rotate(0);
          }
        }

        @keyframes qahwa-cart-count {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }

          55% {
            transform: scale(1.2);
            opacity: 1;
          }

          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .qahwa-cart-bounce {
          animation: qahwa-cart-bounce 0.45s ease-out;
        }

        .qahwa-cart-count {
          animation: qahwa-cart-count 0.35s ease-out;
        }
      `}</style>
    </Link>
  );
}
