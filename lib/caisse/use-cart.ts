"use client";

import { useCallback, useMemo, useState } from "react";
import type { Product } from "@/types/database";
import type { CartItem } from "@/lib/store/cart";

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const add = useCallback((product: Product) => {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.lineId === existing.lineId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...current,
        {
          lineId: `${product.id}-${Date.now()}`,
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((lineId: string, quantity: number) => {
    setItems((current) =>
      quantity <= 0
        ? current.filter((item) => item.lineId !== lineId)
        : current.map((item) =>
            item.lineId === lineId ? { ...item, quantity } : item
          )
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );
  const count = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const quantityOf = useCallback(
    (productId: string) =>
      items.find((item) => item.productId === productId)?.quantity ?? 0,
    [items]
  );

  return { items, add, setQuantity, clear, total, count, quantityOf };
}
