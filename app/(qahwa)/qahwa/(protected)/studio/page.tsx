"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useConfirm, useToast } from "@/components/qahwa/NotificationProvider";

type StudioCreation = {
  id: string;
  name: string;
  category: string;
  design: Record<string, any> | null;
  created_at: string;
  updated_at: string;
};

const SELECT_FIELDS = "id, name, category, design, created_at, updated_at";

const categories = [
  { title: "Publication", slug: "publication" },
  { title: "Nouveau produit", slug: "nouveau-produit" },
  { title: "Promotion", slug: "promotion" },
  { title: "Événement", slug: "evenement" },
];

const defaultCategory = categories[0]!;

const getCategory = (slug: string) =>
  categories.find((item) => item.slug === slug) ?? defaultCategory;

function formatRelative(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;

  return `le ${date.toLocaleDateString("fr-FR")}`;
}

// Image d'aperçu de la création (jamais la photo de la catégorie)
function getPreviewImage(design: Record<string, any> | null) {
  for (const key of ["previewImage", "preview", "thumbnail", "heroImage"]) {
    const value = design?.[key];
    if (typeof value === "string" && value) return value;
  }

  return null;
}

// Format propre à la création (largeur / hauteur), 4:5 par défaut
function getAspectRatio(design: Record<string, any> | null) {
  const width = Number(design?.width);
  const height = Number(design?.height);

  if (width > 0 && height > 0) {
    const ratio = width / height;
    return Math.min(2, Math.max(0.5, ratio));
  }

  return 4 / 5;
}

function CreationThumbnail({ creation }: { creation: StudioCreation }) {
  const image = getPreviewImage(creation.design);
  const [failed, setFailed] = useState(false);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#1f1f1f] to-[#0d0d0d]"
      style={{ aspectRatio: getAspectRatio(creation.design) }}
    >
      {image && !failed ? (
        <img
          src={image}
          alt={creation.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-4 text-center">
          <span className="line-clamp-3 font-display text-sm font-bold uppercase leading-tight tracking-tight text-white/50">
            {creation.name}
          </span>
        </div>
      )}
    </div>
  );
}

function CreationSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-white/10 bg-[#121212] p-2"
        >
          <div className="aspect-[4/5] rounded-xl bg-white/[0.05]" />
          <div className="mt-3 h-3 w-3/4 rounded bg-white/[0.06]" />
          <div className="mt-2 h-2 w-1/2 rounded bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}

export default function StudioPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [creations, setCreations] = useState<StudioCreation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const loadCreations = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createSupabaseBrowserClient() as any;

      const { data, error } = await supabase
        .from("qahwa_studio_creations")
        .select(SELECT_FIELDS)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setCreations((data ?? []) as StudioCreation[]);
    } catch (error) {
      console.error("Erreur de chargement des créations Studio :", error);

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

  const visibleCreations = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return creations;

    return creations.filter((creation) =>
      creation.name.toLowerCase().includes(search)
    );
  }, [creations, query]);

  const openCreation = (creation: StudioCreation) => {
    router.push(
      `/qahwa/studio/${creation.category}?saved=${encodeURIComponent(
        creation.id
      )}`
    );
  };

  const startNew = (slug: string) => {
    setMenuOpen(false);
    router.push(`/qahwa/studio/${slug}?new=1`);
  };

  const duplicateCreation = async (creation: StudioCreation) => {
    setPendingId(creation.id);

    try {
      const supabase = createSupabaseBrowserClient() as any;

      const { data, error } = await supabase
        .from("qahwa_studio_creations")
        .insert({
          name: `${creation.name} (copie)`,
          category: creation.category,
          design: creation.design,
        })
        .select(SELECT_FIELDS)
        .single();

      if (error) throw error;

      setCreations((current) => [data as StudioCreation, ...current]);
      toast.success("Création dupliquée.");
    } catch (error) {
      console.error("Erreur de duplication Studio :", error);
      toast.error("La création n’a pas pu être dupliquée.");
    } finally {
      setPendingId(null);
    }
  };

  const deleteCreation = async (creation: StudioCreation) => {
    const confirmed = await confirm({
      title: "Supprimer cette création ?",
      message: `« ${creation.name} » sera supprimée définitivement.`,
      confirmLabel: "Supprimer",
      cancelLabel: "Annuler",
      tone: "danger",
    });

    if (!confirmed) return;

    setPendingId(creation.id);

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

      toast.success("Création supprimée.");
    } catch (error) {
      console.error("Erreur de suppression Studio :", error);
      toast.error("La création n’a pas pu être supprimée.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <main className="w-full min-w-0 pb-12">
      <div className="space-y-5 px-3 pt-2 sm:space-y-6 sm:px-6 sm:pt-3">
        {/* HERO */}

        <header className="relative isolate z-30 rounded-2xl border border-white/10 bg-[#111]">
          <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
            <img
              src="/studio/hero.jpg"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />

            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/25" />
          </div>

          <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#FF6B00]">
                
              </p>

              <h1 className="mt-1 font-display text-xl font-bold uppercase tracking-tight text-white sm:text-3xl">
                Qahwa Studio
              </h1>
            </div>

            <div className="relative sm:shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-black transition hover:bg-[#FF6B00] sm:w-auto"
              >
                <span className="text-base leading-none">+</span>
                Nouvelle création
              </button>

              {menuOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Fermer le menu"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setMenuOpen(false)}
                  />

                  <div
                    role="menu"
                    className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#141414] shadow-2xl sm:left-auto sm:w-56"
                  >
                    {categories.map((category) => (
                      <button
                        key={category.slug}
                        type="button"
                        role="menuitem"
                        onClick={() => startNew(category.slug)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold text-white/80 transition hover:bg-white/[0.06] hover:text-[#FF6B00]"
                      >
                        {category.title}
                        <span className="text-white/30">+</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ERREUR DE CHARGEMENT */}

        {errorMessage && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">
            <span>{errorMessage}</span>

            <button
              type="button"
              onClick={() => void loadCreations()}
              className="rounded-md border border-red-300/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition hover:bg-red-400/10"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* CRÉATIONS ENREGISTRÉES */}

        <section className="space-y-4 sm:space-y-5">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-display text-lg font-bold uppercase tracking-tight text-white sm:text-2xl">
                Mes créations
              </h2>

              <p className="mt-1.5 text-xs text-qahwa-muted sm:mt-2 sm:text-sm">
                Tes affiches enregistrées, les plus récentes en premier.
              </p>
            </div>

            {creations.length > 0 && (
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher une création…"
                aria-label="Rechercher une création"
                className="w-full rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[16px] text-white placeholder:text-white/30 focus:border-[#FF6B00]/60 focus:outline-none sm:text-xs lg:w-72"
              />
            )}
          </div>

          {loading ? (
            <CreationSkeleton />
          ) : creations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.015] px-4 py-8 text-center sm:py-10">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-2xl text-white/60">
                +
              </div>

              <h3 className="mt-4 text-sm font-semibold text-white">
                Pas encore de création
              </h3>

              <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-white/40">
                Clique sur « Nouvelle création » pour faire ta première
                affiche. Tes créations enregistrées apparaîtront ici.
              </p>
            </div>
          ) : visibleCreations.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center sm:py-10">
              <p className="text-sm text-white/50">
                Aucune création ne correspond à ta recherche.
              </p>

              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#FF6B00] hover:underline"
              >
                Effacer la recherche
              </button>
            </div>
          ) : (
            <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-5">
              {visibleCreations.map((creation) => {
                const category = getCategory(creation.category);
                const busy = pendingId === creation.id;

                return (
                  <article
                    key={creation.id}
                    className={`group mb-3 min-w-0 break-inside-avoid overflow-hidden rounded-xl border border-white/10 bg-[#121212] p-2 transition hover:border-white/25 hover:bg-[#171717] ${
                      busy ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => openCreation(creation)}
                      className="block w-full min-w-0 text-left"
                      aria-label={`Ouvrir ${creation.name} pour la modifier`}
                    >
                      <CreationThumbnail creation={creation} />

                      <h4 className="mt-3 truncate text-xs font-semibold text-white">
                        {creation.name}
                      </h4>

                      <p className="mt-1 truncate text-[9px] text-white/40">
                        {category.title} · {formatRelative(creation.updated_at)}
                      </p>
                    </button>

                    <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-1.5">
                      <button
                        type="button"
                        onClick={() => void duplicateCreation(creation)}
                        className="rounded-md px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/50 transition hover:bg-white/[0.06] hover:text-[#FF6B00]"
                      >
                        Dupliquer
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteCreation(creation)}
                        className="rounded-md px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-red-300/70 transition hover:bg-red-400/10 hover:text-red-200"
                      >
                        {busy ? "…" : "Supprimer"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}