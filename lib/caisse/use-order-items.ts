"use client";

import { useEffect, useState } from "react";
import type { OrderItem } from "@/types/database";
import type { CaisseSupabase } from "./use-caisse-data";

/** Charge les articles d'une commande dès qu'elle est sélectionnée. */
export function useOrderItems(supabase: CaisseSupabase, orderId: string | null) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setItems([]);
      setFailed(false);
      return;
    }

    let cancelled = false;
    setItems([]);
    setFailed(false);
    setLoading(true);

    supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)
      .returns<OrderItem[]>()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setFailed(true);
        else setItems(data ?? []);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, orderId]);

  return { items, loading, failed };
}