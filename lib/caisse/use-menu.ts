"use client";

import { useCallback, useState } from "react";
import type { Category, Product } from "@/types/database";
import type { CaisseSupabase } from "./use-caisse-data";

export type CategoryWithProducts = Category & { products: Product[] };

export function useMenu(supabase: CaisseSupabase) {
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [categoryResult, productResult] = await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("display_order")
          .returns<Category[]>(),
        supabase
          .from("products")
          .select("*")
          .eq("is_available", true)
          .order("display_order")
          .returns<Product[]>(),
      ]);

      if (categoryResult.error || productResult.error) {
        throw new Error("Impossible de charger le menu.");
      }

      const merged = (categoryResult.data ?? []).map((category) => ({
        ...category,
        products: (productResult.data ?? []).filter(
          (product) => product.category_id === category.id
        ),
      }));

      setCategories(merged);
      setActiveId((current) =>
        merged.some((category) => category.id === current)
          ? current
          : (merged[0]?.id ?? null)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement du menu.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const activeCategory = categories.find((category) => category.id === activeId);

  return {
    categories,
    activeId,
    setActiveId,
    activeCategory,
    products: activeCategory?.products ?? [],
    loading,
    error,
    load,
  };
}
