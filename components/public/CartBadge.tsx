"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/store/cart";

export default function CartBadge() {
  // Évite un mismatch d'hydratation : le store persisté ne se lit
  // correctement qu'une fois monté côté client.
  const [mounted, setMounted] = useState(false);
  const totalItems = useCartStore((state) => state.totalItems());

  useEffect(() => setMounted(true), []);

  return (
    <Link href="/commander" className="relative flex items-center">
      <span aria-hidden>🛒</span>
      {mounted && totalItems > 0 && (
        <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full border border-qahwa-noir bg-qahwa-orange text-[10px] font-display text-qahwa-noir">
          {totalItems}
        </span>
      )}
    </Link>
  );
}
