"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CafeTable, Order } from "@/types/database";
import { caisseApi } from "./api";
import { isPendingExternal } from "./selectors";

const POLL_INTERVAL_MS = 3000;

/**
 * Charge les tables et les commandes, les garde à jour (temps réel + relance
 * régulière de sécurité) et signale l'arrivée de nouvelles commandes
 * livraison / à emporter.
 */
export function useCaisseData(onNewExternalOrders: (count: number) => void) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const inFlight = useRef(false);
  const queued = useRef(false);

  const onNewRef = useRef(onNewExternalOrders);
  useEffect(() => {
    onNewRef.current = onNewExternalOrders;
  });

  const reload = useCallback(async () => {
    // Évite de lancer deux chargements en même temps ; si un changement
    // arrive pendant un chargement, on en refait un juste après.
    if (inFlight.current) {
      queued.current = true;
      return;
    }
    inFlight.current = true;

    try {
      const [freshTables, ordersResult] = await Promise.all([
        caisseApi.fetchTables(),
        supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(250)
          .returns<Order[]>(),
      ]);

      if (freshTables) setTables(freshTables);

      if (!ordersResult.error && ordersResult.data) {
        const pending = ordersResult.data.filter(isPendingExternal);

        if (!initialized.current) {
          pending.forEach((order) => seenIds.current.add(order.id));
          initialized.current = true;
        } else {
          const fresh = pending.filter((order) => !seenIds.current.has(order.id));
          fresh.forEach((order) => seenIds.current.add(order.id));
          if (fresh.length > 0) onNewRef.current(fresh.length);
        }

        setOrders(ordersResult.data);
      }
    } catch (error) {
      console.error("Erreur de chargement de la caisse :", error);
    } finally {
      inFlight.current = false;
      if (queued.current) {
        queued.current = false;
        void reload();
      }
    }
  }, [supabase]);

  useEffect(() => {
    void reload();

    const timer = window.setInterval(() => void reload(), POLL_INTERVAL_MS);

    const channel = supabase
      .channel("qahwa-caisse-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => void reload()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables" },
        () => void reload()
      )
      .subscribe();

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [reload, supabase]);

  return { supabase, tables, orders, reload };
}

export type CaisseSupabase = ReturnType<typeof createSupabaseBrowserClient>;
