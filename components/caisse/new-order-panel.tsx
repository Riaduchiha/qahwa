"use client";

import { useMemo, useState } from "react";
import type { CafeTable } from "@/types/database";
import type { useCart } from "@/lib/caisse/use-cart";
import type { useMenu } from "@/lib/caisse/use-menu";
import { money } from "@/lib/caisse/format";
import { Button, PanelHeader } from "./ui";

// Barre de défilement fine et discrète (Chrome, Edge, Firefox)
const scrollbar =
  "[scrollbar-width:thin] [scrollbar-color:rgba(255,107,0,0.45)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#FF6B00]/40 hover:[&::-webkit-scrollbar-thumb]:bg-[#FF6B00]/70";

const inputClass =
  "min-h-[44px] w-full rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 text-sm text-qahwa-text outline-none placeholder:text-qahwa-muted focus:border-qahwa-orange";

export function NewOrderPanel({
  table,
  menu,
  cart,
  submitting,
  onSubmit,
  onClose,
}: {
  table: CafeTable | null;
  menu: ReturnType<typeof useMenu>;
  cart: ReturnType<typeof useCart>;
  submitting: boolean;
  onSubmit: (customerName: string, customerPhone: string) => void;
  onClose: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [query, setQuery] = useState("");

  const searching = query.trim().length > 0;

  const visibleProducts = useMemo(() => {
    if (!searching) return menu.products;
    const q = query.trim().toLowerCase();
    return menu.categories
      .flatMap((category) => category.products)
      .filter((product) => product.name.toLowerCase().includes(q));
  }, [searching, query, menu.products, menu.categories]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title={table ? `Table ${table.number}` : "À emporter"}
        subtitle={table ? "Nouvelle commande" : "Commande à emporter"}
        onClose={onClose}
      />

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* MENU (gauche) */}
        <div className="flex min-h-0 flex-col">
          <div className="shrink-0 space-y-3 border-b border-qahwa-border p-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un produit..."
              aria-label="Rechercher un produit"
              className={inputClass}
            />

            <div
              role="group"
              aria-label="Catégories"
              className={`flex gap-2 overflow-x-auto pb-1.5 ${scrollbar} ${searching ? "opacity-40" : ""}`}
            >
              {menu.categories.map((category) => {
                const active = menu.activeId === category.id && !searching;
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setQuery("");
                      menu.setActiveId(category.id);
                    }}
                    className={`flex min-h-[40px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3 font-display text-xs uppercase transition ${
                      active
                        ? "border-qahwa-orange bg-qahwa-orange text-qahwa-noir"
                        : "border-qahwa-border bg-qahwa-panel2 text-qahwa-muted hover:border-qahwa-orange/60 hover:text-qahwa-text"
                    }`}
                  >
                    {category.name}
                    <span
                      className={`rounded-md px-1.5 text-[10px] ${
                        active ? "bg-black/15" : "bg-white/10"
                      }`}
                    >
                      {category.products.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={`max-h-[55vh] min-h-0 flex-1 overflow-y-auto p-3 lg:max-h-none ${scrollbar}`}
          >
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="font-display text-sm uppercase text-qahwa-text">
                {searching ? `Résultats pour « ${query.trim()} »` : (menu.activeCategory?.name ?? "Menu")}
              </h3>
              <span className="text-xs text-qahwa-muted">{visibleProducts.length} produit(s)</span>
            </div>

            {menu.loading && <p className="text-sm text-qahwa-muted">Chargement du menu...</p>}

            {menu.error && (
              <div
                role="alert"
                className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-qahwa-rouge/50 bg-qahwa-rouge/10 p-3 text-sm text-qahwa-text"
              >
                {menu.error}
                <Button onClick={() => void menu.load()} className="!min-h-0 !px-3 !py-2">
                  Réessayer
                </Button>
              </div>
            )}

            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {visibleProducts.map((product) => {
                const quantity = cart.quantityOf(product.id);
                const image = (product as { image_url?: string | null }).image_url;

                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => cart.add(product)}
                      className={`group relative flex h-full w-full flex-col overflow-hidden rounded-xl border bg-qahwa-panel2 text-left shadow-panel transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qahwa-orange ${
                        quantity > 0
                          ? "border-qahwa-orange"
                          : "border-qahwa-border hover:border-qahwa-orange/60"
                      }`}
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-qahwa-panel">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={image}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition group-hover:scale-105"
                          />
                        ) : (
                          <span
                            aria-hidden
                            className="flex h-full w-full items-center justify-center font-display text-4xl text-qahwa-orange/40"
                          >
                            {product.name.charAt(0).toUpperCase()}
                          </span>
                        )}

                        {quantity > 0 && (
                          <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-md bg-qahwa-orange px-1.5 font-display text-xs text-qahwa-noir">
                            {quantity}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col justify-between gap-1 p-2.5">
                        <span className="line-clamp-2 font-display text-xs uppercase leading-snug text-qahwa-text">
                          {product.name}
                        </span>
                        <span className="text-sm font-semibold text-white">
                          {money(product.price)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            {!menu.loading && !menu.error && visibleProducts.length === 0 && (
              <p className="rounded-lg border border-dashed border-qahwa-border py-10 text-center text-sm text-qahwa-muted">
                {searching ? "Aucun produit ne correspond à ta recherche." : "Aucun produit dans cette catégorie."}
              </p>
            )}
          </div>
        </div>

        {/* PANIER (droite) */}
        <aside
          aria-label="Panier"
          className="flex min-h-0 flex-col border-t border-qahwa-border bg-qahwa-panel lg:border-l lg:border-t-0"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-qahwa-border p-4">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm uppercase text-qahwa-text">Panier</h3>
              {cart.count > 0 && (
                <span className="rounded-full bg-qahwa-orange/15 px-2 py-0.5 text-[11px] font-bold text-qahwa-orange">
                  {cart.count} article{cart.count > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {cart.items.length > 0 && (
              <button
                type="button"
                onClick={cart.clear}
                className="text-[11px] font-semibold uppercase text-qahwa-muted transition hover:text-qahwa-rouge"
              >
                Vider
              </button>
            )}
          </div>

          <div
            className={`max-h-64 min-h-0 flex-1 overflow-y-auto p-3 lg:max-h-none ${scrollbar}`}
          >
            {cart.items.length === 0 ? (
              <div className="flex h-full min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-qahwa-border bg-qahwa-panel2 p-5 text-center">
                <span
                  aria-hidden
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-qahwa-border font-display text-lg text-qahwa-muted"
                >
                  +
                </span>
                <p className="mt-3 font-display text-xs uppercase text-qahwa-text">Panier vide</p>
                <p className="mt-1 text-xs leading-relaxed text-qahwa-muted">
                  Touche un produit du menu pour l'ajouter à la commande.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {cart.items.map((item) => (
                  <li
                    key={item.lineId}
                    className="rounded-xl border border-qahwa-border bg-qahwa-panel2 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-xs uppercase leading-snug text-qahwa-text">
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-qahwa-muted">
                          {money(item.price)} l'unité
                        </p>
                      </div>
                      <span className="shrink-0 font-display text-sm text-white">
                        {money(item.price * item.quantity)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Retirer un ${item.name}`}
                          onClick={() => cart.setQuantity(item.lineId, item.quantity - 1)}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-qahwa-border font-display text-lg text-qahwa-text transition hover:border-qahwa-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qahwa-orange"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-display text-sm text-qahwa-text">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Ajouter un ${item.name}`}
                          onClick={() => cart.setQuantity(item.lineId, item.quantity + 1)}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-qahwa-border font-display text-lg text-qahwa-text transition hover:border-qahwa-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qahwa-orange"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => cart.setQuantity(item.lineId, 0)}
                        className="rounded-md px-2 py-1 text-[11px] font-semibold uppercase text-qahwa-rouge transition hover:bg-qahwa-rouge/10"
                      >
                        Suppr.
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="shrink-0 space-y-3 border-t border-qahwa-border p-4">
            <details className="group" open={!table}>
              <summary className="cursor-pointer list-none text-xs font-semibold uppercase text-qahwa-muted transition hover:text-qahwa-text">
                <span className="mr-1 inline-block transition group-open:rotate-90">▸</span>
                Client (facultatif)
              </summary>
              <div className="mt-2 space-y-2">
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Nom du client"
                  aria-label="Nom du client"
                  className={inputClass}
                />
                <input
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="Téléphone"
                  aria-label="Téléphone du client"
                  inputMode="tel"
                  className={inputClass}
                />
              </div>
            </details>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-qahwa-orange/40 bg-qahwa-orange/10 p-3">
              <div>
                <p className="font-display text-xs uppercase text-qahwa-text">Total</p>
                <p className="text-[11px] text-qahwa-muted">
                  {cart.count} article{cart.count > 1 ? "s" : ""}
                </p>
              </div>
              <span className="font-display text-2xl text-white">{money(cart.total)}</span>
            </div>

            <button
              type="button"
              disabled={submitting || menu.loading || cart.items.length === 0}
              onClick={() => onSubmit(customerName, customerPhone)}
              className="min-h-[52px] w-full rounded-xl border border-qahwa-orange bg-qahwa-orange font-display text-sm uppercase text-qahwa-noir shadow-panel transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qahwa-orange focus-visible:ring-offset-2 focus-visible:ring-offset-qahwa-panel disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Envoi en cours..." : "Valider la commande"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}