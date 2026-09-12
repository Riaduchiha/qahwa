"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartStore } from "@/lib/store/cart";
import { createOrder } from "./actions";
import type { OrderType } from "@/types/database";

function formatPrice(price: number) {
  return `${price} DA`;
}

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: "livraison", label: "Livraison" },
  { value: "emporter", label: "A emporter" },
  { value: "sur_place", label: "Sur place" },
];

const inputClass =
  "rounded-lg border-2 border-qahwa-blanc/20 bg-white/5 px-3 py-2 text-sm text-qahwa-blanc placeholder:text-qahwa-blanc/40 focus:outline-none focus:ring-2 focus:ring-qahwa-orange";

function CommanderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const { items, removeItem, updateQuantity, totalPrice, clear } =
    useCartStore();

  const tableFromQr = searchParams.get("table");
  const [orderType, setOrderType] = useState<OrderType>(
    tableFromQr ? "sur_place" : "livraison"
  );
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryCommune, setDeliveryCommune] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [tableNumber, setTableNumber] = useState(tableFromQr ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <section className="flex min-h-screen flex-col items-center justify-center bg-qahwa-noir px-5 py-10 text-center">
        <h1 className="font-display text-3xl uppercase text-qahwa-blanc">
          Panier
        </h1>
        <p className="mt-4 text-sm text-qahwa-blanc/60">
          Ton panier est vide pour l&apos;instant.
        </p>
        <Link
          href="/menu"
          className="qahwa-cta mt-6 inline-block rounded-full border-2 border-qahwa-noir bg-qahwa-orange px-6 py-3 font-display uppercase text-qahwa-noir shadow-brutal"
        >
          Voir le menu
        </Link>
      </section>
    );
  }

  const deliveryFee = orderType === "livraison" ? 200 : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await createOrder({
      items,
      customerName,
      customerPhone,
      orderType,
      deliveryCommune,
      deliveryAddress,
      deliveryNotes,
      pickupTime,
      tableNumber,
    });

    setSubmitting(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    clear();
    router.push(`/commande/${result.orderId}`);
  }

  return (
    <section className="min-h-screen bg-qahwa-noir px-5 py-10">
      <h1 className="font-display text-3xl uppercase text-qahwa-blanc">
        Panier
      </h1>

      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li
            key={item.lineId}
            className="flex items-center justify-between gap-3 rounded-xl border-2 border-qahwa-blanc/15 bg-white/5 p-4"
          >
            <div>
              <p className="font-display text-sm uppercase text-qahwa-blanc">
                {item.name}
              </p>
              <p className="text-xs text-qahwa-blanc/50">
                {formatPrice(item.price)} / unite
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                className="h-7 w-7 rounded-full border-2 border-qahwa-blanc/20 font-display text-qahwa-blanc"
                aria-label="Diminuer la quantite"
              >
                -
              </button>
              <span className="w-5 text-center font-display text-sm text-qahwa-blanc">
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                className="h-7 w-7 rounded-full border-2 border-qahwa-blanc/20 font-display text-qahwa-blanc"
                aria-label="Augmenter la quantite"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => removeItem(item.lineId)}
                className="ml-2 text-xs text-qahwa-blanc/40 underline"
              >
                Retirer
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className="mt-10 space-y-6">
        <div>
          <p className="mb-2 font-display text-sm uppercase text-qahwa-blanc/60">
            Type de commande
          </p>
          <div className="flex gap-2">
            {ORDER_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setOrderType(type.value)}
                className={`rounded-full border-2 px-4 py-2 text-sm font-display uppercase ${
                  orderType === type.value
                    ? "border-qahwa-orange bg-qahwa-orange text-qahwa-noir"
                    : "border-qahwa-blanc/20 bg-white/5 text-qahwa-blanc/60"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            required
            placeholder="Nom et prenom"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className={inputClass}
          />
          <input
            required
            type="tel"
            placeholder="Telephone"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className={inputClass}
          />
        </div>

        {orderType === "livraison" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Commune"
              value={deliveryCommune}
              onChange={(e) => setDeliveryCommune(e.target.value)}
              className={`${inputClass} sm:col-span-2`}
            />
            <input
              required
              placeholder="Adresse complete"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className={`${inputClass} sm:col-span-2`}
            />
            <input
              placeholder="Infos pour trouver l'adresse (optionnel)"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              className={`${inputClass} sm:col-span-2`}
            />
          </div>
        )}

        {orderType === "emporter" && (
          <input
            placeholder="Heure souhaitee (optionnel)"
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
            className={`w-full ${inputClass}`}
          />
        )}

        {orderType === "sur_place" && (
          <input
            placeholder="Numero de table (si tu le connais)"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className={`w-full ${inputClass}`}
          />
        )}

        <div className="space-y-1 rounded-xl border-2 border-qahwa-blanc/15 bg-white/5 p-4 text-sm">
          <div className="flex justify-between text-qahwa-blanc/60">
            <span>Sous-total</span>
            <span>{formatPrice(totalPrice())}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between text-qahwa-blanc/60">
              <span>Frais de livraison</span>
              <span>{formatPrice(deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-qahwa-blanc/15 pt-2 font-display text-lg text-qahwa-blanc">
            <span>Total</span>
            <span className="text-qahwa-orange">
              {formatPrice(totalPrice() + deliveryFee)}
            </span>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border-2 border-qahwa-blanc/15 bg-white/5 p-3 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="qahwa-cta w-full rounded-full border-2 border-qahwa-noir bg-qahwa-orange py-3 font-display uppercase text-qahwa-noir shadow-brutal disabled:opacity-60"
        >
          {submitting ? "Envoi en cours..." : "Passer commande"}
        </button>
      </form>
    </section>
  );
}

export default function CommanderPage() {
  return (
    <Suspense fallback={null}>
      <CommanderForm />
    </Suspense>
  );
}
