
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

  const current = products[index]!;
  const prev =
    products[(index - 1 + products.length) % products.length]!;
  const next = products[(index + 1) % products.length]!;

  function goTo(target: number) {
    setIndex(target);
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

  return (
    <section
      id={category.slug}
      className="relative min-h-[680px] overflow-hidden bg-qahwa-noir py-16 sm:min-h-[760px] sm:py-20"
    >
      <style>{`
        @keyframes qahwa-product-in {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.94);
          }

          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes qahwa-product-float {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes qahwa-cart-pop {
          0% {
            transform: scale(1);
          }

          35% {
            transform: scale(0.94);
          }

          65% {
            transform: scale(1.04);
          }

          100% {
            transform: scale(1);
          }
        }

        @keyframes qahwa-added {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.9);
          }

          30% {
            opacity: 1;
            transform: translateY(0) scale(1.05);
          }

          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes qahwa-check {
          0% {
            opacity: 0;
            transform: scale(0.5) rotate(-15deg);
          }

          60% {
            opacity: 1;
            transform: scale(1.15) rotate(0);
          }

          100% {
            opacity: 1;
            transform: scale(1) rotate(0);
          }
        }

        .qahwa-product-in {
          animation: qahwa-product-in 0.45s ease-out;
        }

        .qahwa-product-float {
          animation: qahwa-product-float 4s ease-in-out infinite;
        }

        .qahwa-cart-pop {
          animation: qahwa-cart-pop 0.42s ease-out;
        }

        .qahwa-added {
          animation: qahwa-added 0.35s ease-out;
        }

        .qahwa-check {
          animation: qahwa-check 0.35s ease-out;
        }
      `}</style>

      {/* Fond */}
      <div className="pointer-events-none absolute inset-0">
        {current.image_url && (
          <Image
            src={current.image_url}
            alt=""
            fill
            className="scale-125 object-cover opacity-[0.07] blur-3xl"
          />
        )}

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,107,0,0.09),transparent_38%)]" />

        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-qahwa-noir to-transparent" />
      </div>

      {/* Titre catégorie */}
      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex items-end justify-between gap-6">
          <h2 className="font-display text-5xl uppercase leading-[0.85] tracking-[-0.04em] text-qahwa-blanc sm:text-7xl lg:text-8xl">
            {category.name}
          </h2>

          <div className="hidden pb-1 text-right sm:block">
            <p className="text-xs uppercase tracking-[0.18em] text-qahwa-blanc/25">
              {products.length} produit
              {products.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Zone principale */}
      <div className="relative z-10 mx-auto mt-10 flex max-w-7xl items-center justify-center px-5 sm:mt-12 sm:px-8">
        <div className="relative w-full max-w-[900px]">
          {/* Produit précédent */}
          {products.length > 1 && (
            <button
              type="button"
              onClick={() =>
                goTo((index - 1 + products.length) % products.length)
              }
              aria-label={`Voir ${prev.name}`}
              className="absolute left-0 top-[265px] hidden w-32 -translate-x-2 opacity-20 transition-all hover:opacity-50 lg:block xl:w-40"
            >
              <div className="relative h-48 w-full xl:h-56">
                {prev.image_url && (
                  <Image
                    src={prev.image_url}
                    alt=""
                    fill
                    className="object-contain"
                  />
                )}
              </div>

              <p className="mt-2 truncate text-center text-[10px] uppercase tracking-wide text-qahwa-blanc/50">
                {prev.name}
              </p>
            </button>
          )}

          {/* Produit suivant */}
          {products.length > 1 && (
            <button
              type="button"
              onClick={() => goTo((index + 1) % products.length)}
              aria-label={`Voir ${next.name}`}
              className="absolute right-0 top-[265px] hidden w-32 translate-x-2 opacity-20 transition-all hover:opacity-50 lg:block xl:w-40"
            >
              <div className="relative h-48 w-full xl:h-56">
                {next.image_url && (
                  <Image
                    src={next.image_url}
                    alt=""
                    fill
                    className="object-contain"
                  />
                )}
              </div>

              <p className="mt-2 truncate text-center text-[10px] uppercase tracking-wide text-qahwa-blanc/50">
                {next.name}
              </p>
            </button>
          )}

          {/* Flèche gauche */}
          <button
            type="button"
            onClick={() =>
              goTo((index - 1 + products.length) % products.length)
            }
            aria-label="Produit précédent"
            className="group absolute left-1/2 top-[310px] z-30 flex h-11 w-11 -translate-x-[calc(50%+245px)] items-center justify-center rounded-full border border-qahwa-blanc/15 bg-qahwa-blanc/[0.04] text-xl leading-none text-qahwa-blanc transition-all hover:border-qahwa-orange/50 hover:bg-qahwa-orange hover:text-qahwa-noir active:scale-90 sm:top-[350px] sm:h-14 sm:w-14 sm:-translate-x-[calc(50%+320px)]"
          >
            <span className="block -translate-y-[1px] transition-transform group-hover:-translate-x-0.5">
              ←
            </span>
          </button>

          {/* Produit central */}
          <div
            key={current.id}
            className="qahwa-product-in relative mx-auto w-full max-w-[430px]"
          >
            {/* Halo */}
            <div className="pointer-events-none absolute left-1/2 top-[34%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-qahwa-orange/10 blur-[100px] sm:h-96 sm:w-96" />

            {/* Image */}
            <div className="relative mx-auto h-[310px] w-full sm:h-[410px]">
              {current.image_url ? (
                <div className="qahwa-product-float relative h-full w-full">
                  <Image
                    src={current.image_url}
                    alt={current.name}
                    fill
                    className="object-contain drop-shadow-[0_30px_45px_rgba(0,0,0,0.7)]"
                    priority
                  />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="flex h-56 w-56 items-center justify-center rounded-full border border-qahwa-blanc/10 bg-qahwa-blanc/[0.03]">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-qahwa-blanc/20">
                      Photo à venir
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Informations produit */}
            <div className="relative z-20 mx-auto max-w-[390px] text-center">
              <div className="mx-auto mb-5 flex items-center justify-center gap-3">
                <span className="h-px w-8 bg-qahwa-blanc/10" />
                <span className="h-1.5 w-1.5 rounded-full bg-qahwa-orange" />
                <span className="h-px w-8 bg-qahwa-blanc/10" />
              </div>

              <h3 className="font-display text-3xl uppercase leading-[0.9] tracking-[-0.025em] text-qahwa-blanc sm:text-4xl">
                {current.name}
              </h3>

              {current.description && (
                <p className="mx-auto mt-4 max-w-[330px] text-sm leading-relaxed text-qahwa-blanc/45">
                  {current.description}
                </p>
              )}

              <div className="mt-5 flex items-center justify-center gap-3">
                <span className="h-px w-10 bg-qahwa-blanc/10" />

                <span className="font-display text-xl text-qahwa-orange">
                  {formatPrice(current.price)}
                </span>

                <span className="h-px w-10 bg-qahwa-blanc/10" />
              </div>

              {/* Quantité + Ajouter */}
              <div className="mt-7 flex items-center gap-3">
                <div className="flex h-12 shrink-0 items-center rounded-full border border-qahwa-blanc/10 bg-qahwa-blanc/[0.035] px-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setQty((q) => Math.max(1, q - 1))
                    }
                    aria-label="Diminuer la quantité"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-qahwa-blanc/50 transition hover:bg-qahwa-blanc/10 hover:text-qahwa-blanc"
                  >
                    −
                  </button>

                  <span className="w-7 text-center font-display text-sm text-qahwa-blanc">
                    {qty}
                  </span>

                  <button
                    type="button"
                    onClick={() => setQty((q) => q + 1)}
                    aria-label="Augmenter la quantité"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-qahwa-blanc/50 transition hover:bg-qahwa-blanc/10 hover:text-qahwa-blanc"
                  >
                    +
                  </button>
                </div>

                {/* Bouton panier animé */}
                <button
                  type="button"
                  onClick={handleAdd}
                  className={`group flex h-12 flex-1 items-center justify-between rounded-full bg-qahwa-orange px-5 font-display uppercase text-qahwa-noir transition-all duration-200 hover:shadow-[0_10px_35px_rgba(255,107,0,0.18)] active:scale-95 ${
                    added ? "qahwa-cart-pop" : ""
                  }`}
                >
                  {added ? (
                    <>
                      <span className="qahwa-added flex items-center gap-2">
                        <span className="qahwa-check text-base font-bold">
                          ✓
                        </span>
                        <span>Ajouté au panier</span>
                      </span>

                      <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-qahwa-noir px-3 text-xs text-qahwa-orange">
                        +{qty}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>Ajouter</span>

                      <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-qahwa-noir px-3 text-xs text-qahwa-orange transition-transform group-hover:scale-105">
                        {formatPrice(current.price * qty)}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Flèche droite */}
          <button
            type="button"
            onClick={() => goTo((index + 1) % products.length)}
            aria-label="Produit suivant"
            className="group absolute left-1/2 top-[310px] z-30 flex h-11 w-11 -translate-x-[calc(50%-245px)] items-center justify-center rounded-full border border-qahwa-blanc/15 bg-qahwa-blanc/[0.04] text-xl leading-none text-qahwa-blanc transition-all hover:border-qahwa-orange/50 hover:bg-qahwa-orange hover:text-qahwa-noir active:scale-90 sm:top-[350px] sm:h-14 sm:w-14 sm:-translate-x-[calc(50%-320px)]"
          >
            <span className="block -translate-y-[1px] transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </button>
        </div>
      </div>

      {/* Indicateurs */}
      <div className="relative z-20 mt-7 flex items-center justify-center gap-1.5">
        {products.map((product, i) => (
          <button
            key={product.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Voir ${product.name}`}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === index
                ? "w-8 bg-qahwa-orange"
                : "w-2 bg-qahwa-blanc/20 hover:bg-qahwa-blanc/40"
            }`}
          />
        ))}
      </div>

      {/* Compteur */}
      <div className="absolute bottom-6 right-6 hidden font-display text-xs text-qahwa-blanc/20 sm:block">
        {String(index + 1).padStart(2, "0")} /{" "}
        {String(products.length).padStart(2, "0")}
      </div>
    </section>
  );
}

