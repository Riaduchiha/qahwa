"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  // Identifiant unique de la ligne de panier (peut différer du produit
  // si le même produit est ajouté avec des options différentes).
  lineId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "lineId" | "quantity">, quantity?: number) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clear: () => void;
  totalItems: () => number;
  totalPrice: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, quantity = 1) => {
        set((state) => {
          // Même produit sans options distinctes → on incrémente la quantité
          // au lieu de dupliquer la ligne.
          const existing = state.items.find(
            (i) => i.productId === item.productId && i.notes === item.notes
          );

          if (existing) {
            return {
              items: state.items.map((i) =>
                i.lineId === existing.lineId
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            };
          }

          return {
            items: [
              ...state.items,
              {
                ...item,
                lineId: `${item.productId}-${Date.now()}`,
                quantity,
              },
            ],
          };
        });
      },

      removeItem: (lineId) => {
        set((state) => ({
          items: state.items.filter((i) => i.lineId !== lineId),
        }));
      },

      updateQuantity: (lineId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(lineId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.lineId === lineId ? { ...i, quantity } : i
          ),
        }));
      },

      clear: () => set({ items: [] }),

      totalItems: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: "qahwa-cart" }
  )
);
