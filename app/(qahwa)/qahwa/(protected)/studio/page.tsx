
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type StudioCreation = {
  id: string;
  name: string;
  category: string;
  design: Record<string, any> | null;
  created_at: string;
  updated_at: string;
};

const categories = [
  {
    category: "CONTENU",
    title: "Publication",
    subtitle: "Posts et contenus Qahwa",
    slug: "publication",
    format: "Instagram Portrait · 1080 × 1350 px",
    image: "/studio/publication.jpg",
    number: "01",
  },
  {
    category: "PRODUIT",
    title: "Nouveau produit",
    subtitle: "Présente une nouveauté",
    slug: "nouveau-produit",
    format: "Instagram Portrait · 1080 × 1350 px",
    image: "/studio/nouveau-produit.jpg",
    number: "02",
  },
  {
    category: "MARKETING",
    title: "Promotion",
    subtitle: "Offres et promotions",
    slug: "promotion",
    format: "Instagram Portrait · 1080 × 1350 px",
    image: "/studio/promotion.jpg",
    number: "03",
  },
  {
    category: "ÉVÉNEMENT",
    title: "Événement",
    subtitle: "Fêtes et occasions spéciales",
    slug: "evenement",
    format: "Instagram Portrait · 1080 × 1350 px",
    image: "/studio/evenement.jpg",
    number: "04",
  },
];

function CreationThumbnail({
  creation,
  categoryImage,
}: {
  creation: StudioCreation;
  categoryImage: string;
}) {
  const image = creation.design?.heroImage;

  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-white/10 bg-[#111]">
      <img
        src={
          typeof image === "string" && image
            ? image
            : categoryImage
        }
        alt={creation.name}
        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        onError={(event) => {
          const element = event.currentTarget;

          if (!element.dataset.fallbackUsed) {
            element.dataset.fallbackUsed = "true";
            element.src = categoryImage;
          }
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

      <span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/90 backdrop-blur-md">
        Ma création
      </span>
    </div>
  );
}

export default function StudioPage() {
  const router = useRouter();

  const [creations, setCreations] = useState<StudioCreation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCreations = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createSupabaseBrowserClient() as any;

      const { data, error } = await supabase
        .from("qahwa_studio_creations")
        .select("id, name, category, design, created_at, updated_at")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setCreations((data ?? []) as StudioCreation[]);
    } catch (error) {
      console.error(
        "Erreur de chargement des créations Studio :",
        error
      );

      setErrorMessage(
        "Impossible de charger les créations. Vérifie que tu es connecté à Qahwa."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCreations();
  }, [loadCreations]);

  const deleteCreation = async (creation: StudioCreation) => {
    const confirmed = window.confirm(
      `Supprimer « ${creation.name} » ? Cette action est définitive.`
    );

    if (!confirmed) return;

    setDeletingId(creation.id);

    try {
      const supabase = createSupabaseBrowserClient() as any;

      const { error } = await supabase
        .from("qahwa_studio_creations")
        .delete()
        .eq("id", creation.id);

      if (error) throw error;

      setCreations((current) =>
        current.filter((item) => item.id !== creation.id)
      );
    } catch (error) {
      console.error("Erreur de suppression Studio :", error);
      window.alert("La création n’a pas pu être supprimée.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="w-full min-w-0 pb-12">
      <div className="space-y-5 px-4 pt-2 sm:px-6 sm:pt-3">

        {/* BARRE PHOTO AVEC TITRE SIMPLIFIÉ */}

        <header className="relative isolate flex min-h-[90px] items-center overflow-hidden rounded-xl border border-white/10 bg-[#111] sm:min-h-[100px]">
          <img
            src="/studio/hero.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-20 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />

          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/55 to-black/20" />

          <div className="px-4 py-3 sm:px-6 sm:py-3">
            <h1 className="font-display text-xl font-bold uppercase tracking-tight text-white sm:text-2xl">
              Qahwa Studio
            </h1>
          </div>
        </header>

        {/* ERREUR DE CHARGEMENT */}

        {errorMessage && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        {/* LES QUATRE CATÉGORIES */}

        <section>
          <div className="mb-5">
            <h2 className="font-display text-xl font-bold uppercase tracking-tight text-white sm:text-2xl">
              Que veux-tu créer ?
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {categories.map((category) => {
              const categoryCreations = creations.filter(
                (creation) => creation.category === category.slug
              );

              return (
                <article
                  key={category.slug}
                  className="group min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#141414] transition duration-300 hover:-translate-y-1 hover:border-white/25"
                >
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/qahwa/studio/${category.slug}?new=1`
                      )
                    }
                    aria-label={`Créer une affiche : ${category.title}`}
                    className="relative block aspect-[4/5] w-full overflow-hidden text-left"
                  >
                    <img
                      src={category.image}
                      alt={category.title}
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/5" />

                    <span className="absolute left-4 top-4 rounded-md border border-white/20 bg-black/35 px-2.5 py-1.5 text-[9px] font-semibold tracking-[0.15em] text-white/80 backdrop-blur-md">
                      {category.number} / 04
                    </span>

                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#FF6B00]">
                        {category.category}
                      </p>

                      <h3 className="mt-2 font-display text-2xl font-bold uppercase leading-tight tracking-tight text-white">
                        {category.title}
                      </h3>

                      <p className="mt-2 text-xs leading-5 text-white/70">
                        {category.subtitle}
                      </p>

                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/20 pt-3">
                        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                          Créer une affiche
                        </span>

                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-lg text-black transition group-hover:bg-[#FF6B00]">
                          +
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <span className="min-w-0 truncate text-[9px] uppercase tracking-[0.08em] text-white/35">
                      {category.format}
                    </span>

                    <span className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] text-white/60">
                      {categoryCreations.length}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* CRÉATIONS ENREGISTRÉES */}

        <section className="space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h2 className="font-display text-xl font-bold uppercase tracking-tight text-white sm:text-2xl">
              Mes créations
            </h2>

            <p className="mt-2 text-sm text-qahwa-muted">
              Tes affiches enregistrées, classées par catégorie.
            </p>
          </div>

          {loading ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-white/40">
              Chargement des créations…
            </div>
          ) : creations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.015] px-4 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-2xl text-white/60">
                +
              </div>

              <h3 className="mt-4 text-sm font-semibold text-white">
                Pas encore de création
              </h3>

              <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-white/40">
                Choisis une catégorie ci-dessus pour créer ta première
                affiche. Tes créations enregistrées apparaîtront ici.
              </p>
            </div>
          ) : (
            categories.map((category) => {
              const categoryCreations = creations.filter(
                (creation) => creation.category === category.slug
              );

              if (categoryCreations.length === 0) {
                return null;
              }

              return (
                <section key={category.slug} className="min-w-0">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#FF6B00]">
                        {category.category} · {category.number}
                      </p>

                      <h3 className="mt-1 font-display text-lg font-bold uppercase text-white">
                        {category.title}
                      </h3>
                    </div>

                    <span className="text-[10px] text-white/40">
                      {categoryCreations.length}{" "}
                      {categoryCreations.length > 1
                        ? "créations"
                        : "création"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {categoryCreations.map((creation) => (
                      <article
                        key={creation.id}
                        className="group min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#121212] p-2 transition hover:border-white/25 hover:bg-[#171717]"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/qahwa/studio/${creation.category}?saved=${encodeURIComponent(
                                creation.id
                              )}`
                            )
                          }
                          className="block w-full min-w-0 text-left"
                          aria-label={`Ouvrir ${creation.name} pour la modifier`}
                        >
                          <CreationThumbnail
                            creation={creation}
                            categoryImage={category.image}
                          />

                          <h4 className="mt-3 truncate text-xs font-semibold text-white">
                            {creation.name}
                          </h4>

                          <p className="mt-1 text-[9px] text-white/40">
                            Modifiée le{" "}
                            {new Date(
                              creation.updated_at
                            ).toLocaleDateString("fr-FR")}
                          </p>

                          <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.08em] text-white/60 transition group-hover:text-[#FF6B00]">
                            Modifier ↗
                          </p>
                        </button>

                        <div className="mt-3 flex justify-end border-t border-white/10 pt-2">
                          <button
                            type="button"
                            disabled={deletingId === creation.id}
                            onClick={() =>
                              void deleteCreation(creation)
                            }
                            className="rounded-md px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-red-300/70 transition hover:bg-red-400/10 hover:text-red-200 disabled:opacity-40"
                          >
                            {deletingId === creation.id
                              ? "Suppression…"
                              : "Supprimer"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
