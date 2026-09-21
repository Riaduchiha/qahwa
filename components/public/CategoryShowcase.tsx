"use client";

import { useState } from "react";
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

  if (products.length === 0) return null;

  const current = products[index];
  const prev = products[(index - 1 + products.length) % products.length];
  const next = products[(index + 1) % products.length];

  if (!current || !prev || !next) return null;

  function goTo(target: number) {
    setIndex(target);
    setQty(1);
  }

  function handleAdd() {
    addItem(
      { productId: current!.id, name: current!.name, price: current!.price },
      qty
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <div
      id={category.slug}
      className="relative scroll-mt-20 flex min-h-[640px] flex-col justify-center overflow-hidden bg-qahwa-noir py-14 sm:min-h-[760px]"
    >
      <style>{`
        @keyframes qahwa-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes qahwa-pop-in {
          0% { opacity: 0; transform: scale(0.9) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .qahwa-float {
          animation: qahwa-float 4s ease-in-out infinite;
        }
        .qahwa-pop-in {
          animation: qahwa-pop-in 0.45s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>

      <div key={current.id} className="absolute inset-0">
        {current.image_url ? (
          <Image
            src={current.image_url}
            alt=""
            fill
            className="scale-125 object-cover opacity-40 blur-2xl"
          />
        ) : (
          <div className="h-full w-full bg-qahwa-orange/10" />
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-qahwa-noir/50 via-qahwa-noir/75 to-qahwa-noir" />

      <p className="relative z-10 px-6 font-display text-[11px] uppercase tracking-[0.25em] text-qahwa-orange sm:px-10">
        Rejoins le club QAHWA
      </p>
      <h2 className="relative z-10 px-6 font-display text-5xl uppercase leading-[0.9] text-qahwa-blanc sm:px-10 sm:text-8xl">
        {category.name}
      </h2>

      <div className="relative z-10 mt-10 flex items-center justify-between">
        <button
          onClick={() => goTo((index - 1 + products.length) % products.length)}
          aria-label="Produit precedent"
          className="z-30 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-qahwa-noir bg-qahwa-blanc font-display text-2xl text-qahwa-noir shadow-brutal sm:h-16 sm:w-16 sm:text-3xl"
        >
          &lsaquo;
        </button>

        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
          {products.length > 1 && (
            <button
              onClick={() =>
                goTo((index - 1 + products.length) % products.length)
              }
              aria-label={`Voir ${prev.name}`}
              className="absolute left-0 z-10 hidden w-28 -translate-x-10 opacity-60 transition-opacity hover:opacity-90 sm:block lg:w-36"
            >
              <div className="relative h-52 w-full lg:h-64">
                {prev.image_url ? (
                  <Image
                    src={prev.image_url}
                    alt=""
                    fill
                    className="object-contain drop-shadow-2xl"
                  />
                ) : null}
              </div>
            </button>
          )}

          <div
            key={current.id}
            className="qahwa-pop-in relative z-20 mx-2 w-full max-w-[300px] sm:mx-4 sm:max-w-md"
          >
            <div className="relative mx-auto h-72 w-full sm:h-[26rem]">
              {current.image_url ? (
                <>
                  <div
                    aria-hidden
                    className="absolute left-1/2 top-1/2 h-[85%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-qahwa-orange/25 blur-3xl"
                  />
                  <div className="qahwa-float relative h-full w-full">
                    <Image
                      src={current.image_url}
                      alt={current.name}
                      fill
                      className="object-contain drop-shadow-2xl"
                      priority
                    />
                  </div>
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-qahwa-orange/30 bg-gradient-to-b from-qahwa-orange/10 to-transparent">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-qahwa-orange/50"
                  >
                    <path
                      d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M8 4c0 1-1 1-1 2M12 4c0 1-1 1-1 2M16 4c0 1-1 1-1 2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="font-display text-[10px] uppercase tracking-wide text-qahwa-blanc/40">
                    Photo a venir
                  </span>
                </div>
              )}
            </div>

            <h3 className="mt-4 text-center font-display text-2xl uppercase leading-tight text-qahwa-blanc sm:text-3xl">
              {current.name}
            </h3>
            {current.description && (
              <p className="mt-1 text-center text-xs text-qahwa-blanc/60">
                {current.description}
              </p>
            )}

            <div className="mt-5 flex items-center justify-center gap-2 rounded-full border-2 border-qahwa-blanc/30 bg-qahwa-blanc/10 px-2 py-1.5 backdrop-blur">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Diminuer la quantite"
                className="flex h-6 w-6 items-center justify-center font-display text-qahwa-blanc"
              >
                &minus;
              </button>
              <span className="w-4 text-center font-display text-sm text-qahwa-blanc">
                {qty}
              </span>
              <button
                onClick={() => setQty((q) => q + 1)}
                aria-label="Augmenter la quantite"
                className="flex h-6 w-6 items-center justify-center font-display text-qahwa-blanc"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAdd}
              className="qahwa-cta mt-3 flex w-full items-center justify-between rounded-full border-2 border-qahwa-noir bg-qahwa-orange py-3 pl-6 pr-2 font-display uppercase text-qahwa-noir shadow-brutal transition-transform active:scale-95"
            >
              <span>{added ? "Ajoute !" : "Ajouter"}</span>
              <span className="rounded-full bg-qahwa-noir px-3 py-1.5 text-sm text-qahwa-orange">
                {formatPrice(current.price * qty)}
              </span>
            </button>
          </div>

          {products.length > 1 && (
            <button
              onClick={() => goTo((index + 1) % products.length)}
              aria-label={`Voir ${next.name}`}
              className="absolute right-0 z-10 hidden w-28 translate-x-10 opacity-60 transition-opacity hover:opacity-90 sm:block lg:w-36"
            >
              <div className="relative h-52 w-full lg:h-64">
                {next.image_url ? (
                  <Image
                    src={next.image_url}
                    alt=""
                    fill
                    className="object-contain drop-shadow-2xl"
                  />
                ) : null}
              </div>
            </button>
          )}
        </div>

        <button
          onClick={() => goTo((index + 1) % products.length)}
          aria-label="Produit suivant"
          className="z-30 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-qahwa-noir bg-qahwa-blanc font-display text-2xl text-qahwa-noir shadow-brutal sm:h-16 sm:w-16 sm:text-3xl"
        >
          &rsaquo;
        </button>
      </div>

      <div className="relative z-10 mt-8 flex justify-center gap-1.5">
        {products.map((p, i) => (
          <button
            key={p.id}
            onClick={() => goTo(i)}
            aria-label={`Voir ${p.name}`}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-qahwa-orange" : "w-1.5 bg-qahwa-blanc/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}