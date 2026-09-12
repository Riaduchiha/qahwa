"use client";

import { useCartStore } from "@/lib/store/cart";

type Props = {
  productId: string;
  name: string;
  price: number;
};

export default function AddToCartButton({ productId, name, price }: Props) {
  const addItem = useCartStore((state) => state.addItem);

  return (
    <button
      type="button"
      onClick={() => addItem({ productId, name, price })}
      className="mt-3 rounded-lg border-2 border-qahwa-noir bg-qahwa-orange px-3 py-1.5 font-display text-xs uppercase text-qahwa-noir shadow-brutal-sm transition-transform active:scale-95"
    >
      Ajouter au panier
    </button>
  );
}
