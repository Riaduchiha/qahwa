
"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartStore } from "@/lib/store/cart";
import { createOrder } from "./actions";
import type { OrderType } from "@/types/database";

function formatPrice(price: number) {
  return `${price.toLocaleString("fr-FR")} DA`;
}

const ORDER_TYPES: { value: OrderType; label: string; description: string }[] = [
  {
    value: "livraison",
    label: "Livraison",
    description: "Chez vous",
  },
  {
    value: "emporter",
    label: "À emporter",
    description: "Je récupère ma commande",
  },
  {
    value: "sur_place",
    label: "Sur place",
    description: "Je suis chez QAHWA",
  },
];

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-sm text-qahwa-blanc outline-none transition-all placeholder:text-qahwa-blanc/25 focus:border-qahwa-orange/50 focus:bg-white/[0.07] focus:ring-4 focus:ring-qahwa-orange/10";

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
      <main className="min-h-screen bg-qahwa-noir px-5 py-16">
        <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-3xl">
            🛒
          </div>

          <p className="mt-7 text-[10px] uppercase tracking-[0.3em] text-qahwa-orange">
            QAHWA
          </p>

          <h1 className="mt-3 font-display text-4xl uppercase tracking-[-0.03em] text-qahwa-blanc sm:text-5xl">
            Ton panier est vide
          </h1>

          <p className="mt-4 max-w-sm text-sm leading-relaxed text-qahwa-blanc/40">
            Ajoute quelques produits depuis notre menu pour commencer ta
            commande.
          </p>

          <Link
            href="/menu"
            className="mt-8 rounded-full bg-qahwa-orange px-7 py-3.5 font-display text-sm uppercase text-qahwa-noir transition-all hover:shadow-[0_12px_40px_rgba(255,107,0,0.18)] active:scale-95"
          >
            Voir le menu
          </Link>
        </div>
      </main>
    );
  }

  const deliveryFee = orderType === "livraison" ? 200 : 0;
  const subtotal = totalPrice();
  const total = subtotal + deliveryFee;

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

    router.push(
      `/commande/${result.orderId}?token=${result.confirmationToken}`
    );
  }

  return (
    <main className="min-h-screen bg-qahwa-noir px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        {/* En-tête */}
        <div className="mb-10 flex items-end justify-between gap-5">
          <div>
            <Link
              href="/menu"
              className="mb-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-qahwa-blanc/30 transition hover:text-qahwa-orange"
            >
              <span>←</span>
              Retour au menu
            </Link>

            <p className="text-[10px] uppercase tracking-[0.3em] text-qahwa-orange">
              QAHWA
            </p>

            <h1 className="mt-2 font-display text-4xl uppercase leading-none tracking-[-0.04em] text-qahwa-blanc sm:text-6xl">
              Ta commande
            </h1>
          </div>

          <div className="hidden text-right sm:block">
            <p className="text-[10px] uppercase tracking-[0.2em] text-qahwa-blanc/25">
              {items.reduce((sum, item) => sum + item.quantity, 0)} article
              {items.reduce((sum, item) => sum + item.quantity, 0) > 1
                ? "s"
                : ""}
            </p>
            <p className="mt-1 font-display text-sm text-qahwa-blanc/50">
              {formatPrice(subtotal)}
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_390px] lg:items-start">
          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Type de commande */}
            <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
              <div className="mb-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-qahwa-orange">
                  Étape 01
                </p>

                <h2 className="mt-1 font-display text-xl uppercase text-qahwa-blanc">
                  Comment veux-tu ta commande ?
                </h2>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {ORDER_TYPES.map((type) => {
                  const active = orderType === type.value;

                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setOrderType(type.value)}
                      className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
                        active
                          ? "border-qahwa-orange/60 bg-qahwa-orange text-qahwa-noir shadow-[0_10px_35px_rgba(255,107,0,0.12)]"
                          : "border-white/10 bg-white/[0.025] text-qahwa-blanc/60 hover:border-white/20 hover:bg-white/[0.05]"
                      }`}
                    >
                      {active && (
                        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-qahwa-noir text-[10px] text-qahwa-orange">
                          ✓
                        </span>
                      )}

                      <span className="block font-display text-sm uppercase">
                        {type.label}
                      </span>

                      <span
                        className={`mt-1 block text-[11px] ${
                          active
                            ? "text-qahwa-noir/55"
                            : "text-qahwa-blanc/25"
                        }`}
                      >
                        {type.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Informations */}
            <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
              <div className="mb-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-qahwa-orange">
                  Étape 02
                </p>

                <h2 className="mt-1 font-display text-xl uppercase text-qahwa-blanc">
                  Tes informations
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  required
                  placeholder="Nom et prénom"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={inputClass}
                />

                <input
                  required
                  type="tel"
                  placeholder="Téléphone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className={inputClass}
                />
              </div>

              {orderType === "livraison" && (
                <div className="mt-3 space-y-3">
                  <input
                    required
                    placeholder="Commune"
                    value={deliveryCommune}
                    onChange={(e) => setDeliveryCommune(e.target.value)}
                    className={inputClass}
                  />

                  <input
                    required
                    placeholder="Adresse complète"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className={inputClass}
                  />

                  <input
                    placeholder="Infos pour trouver l'adresse (optionnel)"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}

              {orderType === "emporter" && (
                <div className="mt-3">
                  <input
                    placeholder="Heure souhaitée (optionnel)"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}

              {orderType === "sur_place" && (
                <div className="mt-3">
                  <input
                    placeholder="Numéro de table (si tu le connais)"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
            </section>

            {/* Erreur */}
            {error && (
              <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Bouton mobile */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-qahwa-orange py-4 font-display text-sm uppercase text-qahwa-noir transition-all hover:shadow-[0_15px_45px_rgba(255,107,0,0.16)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 lg:hidden"
            >
              {submitting ? "Envoi en cours..." : "Confirmer la commande"}
            </button>
          </form>

          {/* Panier */}
          <aside className="lg:sticky lg:top-6">
            <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
              <div className="flex items-center justify-between border-b border-white/10 p-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-qahwa-orange">
                    Résumé
                  </p>

                  <h2 className="mt-1 font-display text-xl uppercase text-qahwa-blanc">
                    Ton panier
                  </h2>
                </div>

                <Link
                  href="/menu"
                  className="text-[10px] uppercase tracking-[0.15em] text-qahwa-blanc/30 transition hover:text-qahwa-orange"
                >
                  Modifier
                </Link>
              </div>

              <div className="max-h-[420px] overflow-y-auto p-4">
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li
                      key={item.lineId}
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 transition hover:border-white/15"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm uppercase text-qahwa-blanc">
                            {item.name}
                          </p>

                          <p className="mt-1 text-[11px] text-qahwa-blanc/30">
                            {formatPrice(item.price)} / unité
                          </p>
                        </div>

                        <p className="shrink-0 font-display text-sm text-qahwa-blanc">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => removeItem(item.lineId)}
                          className="text-[10px] uppercase tracking-[0.12em] text-qahwa-blanc/25 transition hover:text-red-300"
                        >
                          Retirer
                        </button>

                        <div className="flex items-center rounded-full border border-white/10 bg-white/[0.03] p-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.lineId, item.quantity - 1)
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-qahwa-blanc/50 transition hover:bg-white/10 hover:text-qahwa-blanc"
                            aria-label="Diminuer la quantité"
                          >
                            −
                          </button>

                          <span className="w-7 text-center font-display text-xs text-qahwa-blanc">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.lineId, item.quantity + 1)
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-qahwa-blanc/50 transition hover:bg-white/10 hover:text-qahwa-blanc"
                            aria-label="Augmenter la quantité"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Total */}
              <div className="border-t border-white/10 p-5">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-qahwa-blanc/35">
                    <span>Sous-total</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>

                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-qahwa-blanc/35">
                      <span>Livraison</span>
                      <span>{formatPrice(deliveryFee)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-end justify-between border-t border-white/10 pt-4">
                  <span className="font-display text-sm uppercase text-qahwa-blanc/50">
                    Total
                  </span>

                  <span className="font-display text-2xl text-qahwa-orange">
                    {formatPrice(total)}
                  </span>
                </div>

                {/* Bouton desktop */}
                <button
                  type="submit"
                  form=""
                  disabled={submitting}
                  onClick={() => {
                    const form = document.querySelector(
                      "form"
                    ) as HTMLFormElement | null;

                    form?.requestSubmit();
                  }}
                  className="mt-5 hidden w-full rounded-2xl bg-qahwa-orange py-4 font-display text-sm uppercase text-qahwa-noir transition-all hover:shadow-[0_15px_45px_rgba(255,107,0,0.16)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 lg:block"
                >
                  {submitting ? "Envoi en cours..." : "Confirmer la commande"}
                </button>

                <p className="mt-3 text-center text-[9px] uppercase tracking-[0.12em] text-qahwa-blanc/20">
                  Commande sécurisée · QAHWA
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function CommanderPage() {
  return (
    <Suspense fallback={null}>
      <CommanderForm />
    </Suspense>
  );
}

