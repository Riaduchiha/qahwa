"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useCartStore } from "@/lib/store/cart";
import type { Category, Product } from "@/types/database";

function formatPrice(price: number) {
  return `${price} DA`;
}

export default function CategoryShowcase({
  category,
  products,
}: {
  category: Category;
  products: Product[];
}) {
  const [index, setIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  const thumbsRef = useRef<HTMLUListElement>(null);
  const touchStartX = useRef<number | null>(null);

  // La bande de miniatures suit le produit affiché, en défilant
  // uniquement de gauche à droite (jamais la page entière).
  useEffect(() => {
    const list = thumbsRef.current;
    const item = list?.children[index] as HTMLElement | undefined;
    if (!list || !item) return;

    list.scrollTo({
      left: item.offsetLeft - list.clientWidth / 2 + item.clientWidth / 2,
      behavior: "smooth",
    });
  }, [index]);

  if (products.length === 0) return null;

  const count = products.length;
  const current = products[index]!;

  // Photo de fond de la catégorie : sa propre photo si elle existe,
  // sinon la photo d'un de ses produits (floutée).
  const categoryPhoto =
    (category as { image_url?: string | null }).image_url ?? null;
  const fallbackPhoto = products.find((p) => p.image_url)?.image_url ?? null;
  const backgroundPhoto = categoryPhoto ?? fallbackPhoto;

  function goTo(target: number) {
    setIndex((target + count) % count);
    setQty(1);
    setAdded(false);
  }

  function handleAdd() {
    addItem(
      {
        productId: current.id,
        name: current.name,
        price: current.price,
      },
      qty
    );

    setAdded(true);

    setTimeout(() => {
      setAdded(false);
    }, 1400);
  }

  function onTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: React.TouchEvent) {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null || count < 2) return;

    const end = event.changedTouches[0]?.clientX ?? start;
    const delta = end - start;

    if (Math.abs(delta) > 50) goTo(index + (delta < 0 ? 1 : -1));
  }

  return (
    <section
      id={category.slug}
      aria-label={category.name}
      className="relative overflow-hidden bg-qahwa-noir py-8 sm:py-20"
    >
      <style>{`
        @keyframes qahwa-product-in {
          0% { opacity: 0; transform: translateY(18px) scale(0.94); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes qahwa-product-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes qahwa-cart-pop {
          0% { transform: scale(1); }
          35% { transform: scale(0.96); }
          65% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        @keyframes qahwa-added {
          0% { opacity: 0; transform: translateY(8px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .qahwa-product-in { animation: qahwa-product-in 0.45s ease-out; }
        .qahwa-product-float { animation: qahwa-product-float 4s ease-in-out infinite; }
        .qahwa-cart-pop { animation: qahwa-cart-pop 0.42s ease-out; }
        .qahwa-added { animation: qahwa-added 0.3s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .qahwa-product-in,
          .qahwa-product-float,
          .qahwa-cart-pop,
          .qahwa-added { animation: none; }
        }
      `}</style>

      {/* Photo de la catégorie en fond de toute la section */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {backgroundPhoto && (
          <Image
            src={backgroundPhoto}
            alt=""
            fill
            sizes="100vw"
            className={
              categoryPhoto
                ? "object-cover opacity-40"
                : "scale-125 object-cover opacity-30 blur-3xl"
            }
          />
        )}

        {/* Voile sombre pour garder les textes lisibles */}
        <div className="absolute inset-0 bg-qahwa-noir/55" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_45%,rgba(255,107,0,0.10),transparent_45%)]" />

        {/* Fondu vers le noir en haut et en bas de la section */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-qahwa-noir to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-qahwa-noir to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
        {/* En-tête */}
        <h2 className="font-display text-4xl uppercase leading-[0.9] tracking-[-0.04em] text-qahwa-blanc sm:text-6xl lg:text-7xl">
          {category.name}
        </h2>

        <div className="mt-4 grid grid-cols-1 items-start gap-5 lg:mt-12 lg:grid-cols-2 lg:gap-12">
          {/* SCÈNE : produit */}
          <div
            className="relative mx-auto aspect-square w-full min-w-0 max-w-[520px] touch-pan-y select-none overflow-hidden rounded-[2rem] border border-qahwa-blanc/[0.07] bg-qahwa-noir/40 backdrop-blur-sm"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-qahwa-orange/15 blur-[90px]" />

            <div key={current.id} className="qahwa-product-in absolute inset-3 sm:inset-10">
              {current.image_url ? (
                <div className="qahwa-product-float relative h-full w-full">
                  <Image
                    src={current.image_url}
                    alt={current.name}
                    fill
                    sizes="(max-width: 1024px) 90vw, 520px"
                    className="object-contain drop-shadow-[0_30px_45px_rgba(0,0,0,0.7)]"
                    priority
                  />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="flex h-48 w-48 items-center justify-center rounded-full border border-qahwa-blanc/10 bg-qahwa-blanc/[0.03] font-display text-6xl text-qahwa-orange/40">
                    {current.name.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
            </div>

           {count > 1 && (
  <>
    <button
      type="button"
      onClick={() => goTo(index - 1)}
      aria-label="Produit précédent"
      className="absolute left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-qahwa-orange/50 bg-qahwa-noir/70 text-qahwa-orange backdrop-blur transition active:scale-90 active:bg-qahwa-orange active:text-qahwa-noir focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qahwa-orange sm:left-3 sm:h-12 sm:w-12 [@media(hover:hover)]:hover:bg-qahwa-orange [@media(hover:hover)]:hover:text-qahwa-noir"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
        <path d="M15 6l-6 6 6 6" />
      </svg>
    </button>
    <button
      type="button"
      onClick={() => goTo(index + 1)}
      aria-label="Produit suivant"
      className="absolute right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-qahwa-orange/50 bg-qahwa-noir/70 text-qahwa-orange backdrop-blur transition active:scale-90 active:bg-qahwa-orange active:text-qahwa-noir focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qahwa-orange sm:right-3 sm:h-12 sm:w-12 [@media(hover:hover)]:hover:bg-qahwa-orange [@media(hover:hover)]:hover:text-qahwa-noir"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  </>
)}
          </div>

          {/* INFOS */}
          <div className="mx-auto w-full min-w-0 max-w-[520px] lg:mx-0">
            {/* Hauteurs réservées : la page ne bouge plus d'un produit à l'autre */}
            <div key={current.id} className="qahwa-product-in">
              <h3 className="line-clamp-2 min-h-[1.9em] font-display text-2xl uppercase leading-[0.95] tracking-[-0.025em] text-qahwa-blanc sm:text-5xl">
                {current.name}
              </h3>

              <p className="mt-2 line-clamp-3 min-h-[2.9rem] max-w-md text-sm leading-relaxed text-qahwa-blanc/70 sm:mt-4 sm:min-h-[4.9rem] sm:text-base">
                {current.description}
              </p>

              <p className="mt-3 font-display text-2xl text-qahwa-orange sm:mt-6 sm:text-4xl">
                {formatPrice(current.price)}
              </p>
            </div>

            {/* Quantité + Ajouter */}
            <div className="mt-4 flex items-center gap-3 sm:mt-6">
              <div className="flex h-12 shrink-0 items-center rounded-full border border-qahwa-blanc/15 bg-qahwa-noir/50 px-1.5 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Diminuer la quantité"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-qahwa-blanc/60 transition hover:bg-qahwa-blanc/10 hover:text-qahwa-blanc focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qahwa-orange"
                >
                  −
                </button>
                <span className="w-8 text-center font-display text-base text-qahwa-blanc">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  aria-label="Augmenter la quantité"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-qahwa-blanc/60 transition hover:bg-qahwa-blanc/10 hover:text-qahwa-blanc focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qahwa-orange"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                className={`group flex h-12 min-w-0 flex-1 items-center justify-between gap-2 rounded-full bg-qahwa-orange px-4 font-display text-xs uppercase text-qahwa-noir transition-all duration-200 hover:shadow-[0_10px_35px_rgba(255,107,0,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qahwa-blanc focus-visible:ring-offset-2 focus-visible:ring-offset-qahwa-noir active:scale-95 sm:px-6 sm:text-sm ${
                  added ? "qahwa-cart-pop" : ""
                }`}
              >
                {added ? (
                  <>
                    <span className="qahwa-added flex min-w-0 items-center gap-2">
                      <span aria-hidden className="text-base font-bold">✓</span>
                      <span className="truncate">Ajouté au panier</span>
                    </span>
                    <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-qahwa-noir px-3 text-xs text-qahwa-orange">
                      +{qty}
                    </span>
                  </>
                ) : (
                  <>
                    <span>Ajouter</span>
                    <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-qahwa-noir px-3 text-xs text-qahwa-orange transition-transform group-hover:scale-105">
                      {formatPrice(current.price * qty)}
                    </span>
                  </>
                )}
              </button>
            </div>

            <span className="sr-only" role="status">
              {added ? `${current.name} ajouté au panier` : ""}
            </span>

            {/* Miniatures */}
            {count > 1 && (
              <ul
                ref={thumbsRef}
                aria-label={`Produits de la catégorie ${category.name}`}
                className="relative mt-4 flex gap-2 overflow-x-auto pb-2 sm:mt-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {products.map((product, i) => (
                  <li key={product.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-label={`Voir ${product.name}`}
                      aria-current={i === index}
                      className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qahwa-orange ${
                        i === index
                          ? "border-qahwa-orange bg-qahwa-orange/10"
                          : "border-qahwa-blanc/10 bg-qahwa-noir/40 opacity-60 hover:opacity-100"
                      }`}
                    >
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-contain p-1.5"
                        />
                      ) : (
                        <span className="font-display text-lg text-qahwa-blanc/40">
                          {product.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}