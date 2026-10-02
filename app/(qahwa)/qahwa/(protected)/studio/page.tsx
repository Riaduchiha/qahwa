"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type StudioTemplate = {
  id: string;
  name: string;
  category: string;
  format: string;
  width: number;
  height: number;
  base_image_url: string | null;
  editable_elements: Array<{
    type: string;
    label: string;
  }>;
  fixed_elements: Array<{
    type: string;
    label: string;
  }>;
};

const CATEGORIES = [
  "Tous",
  "Nouveau produit",
  "Promotion",
  "Offre spéciale",
  "Happy Hour",
  "Événement",
  "Nouveau dessert",
  "Information",
  "Fermeture exceptionnelle",
  "Fêtes / occasions spéciales",
];

export default function StudioPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [templates, setTemplates] = useState<StudioTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");

  useEffect(() => {
    let cancelled = false;

    async function loadTemplates() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("studio_templates")
        .select(
          "id, name, category, format, width, height, base_image_url, editable_elements, fixed_elements"
        )
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("Erreur Studio templates :", error);
        setError("Impossible de charger les modèles.");
        setTemplates([]);
      } else {
        setTemplates((data ?? []) as StudioTemplate[]);
      }

      setLoading(false);
    }

    loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const filteredTemplates =
    selectedCategory === "Tous"
      ? templates
      : templates.filter(
          (template) => template.category === selectedCategory
        );

  function handleUseTemplate(template: StudioTemplate) {
    console.log("Modèle sélectionné :", template);

    alert(
      `Modèle "${template.name}" sélectionné.\n\nL'éditeur sera ajouté à l'étape suivante.`
    );
  }

  return (
    <div className="min-h-full pb-10">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl border border-qahwa-border bg-qahwa-panel p-6 shadow-panel">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-qahwa-orange/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-qahwa-orange" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-qahwa-muted">
                Création de contenu
              </span>
            </div>

            <h1 className="font-display text-3xl uppercase tracking-tight text-qahwa-text md:text-4xl">
              Studio
            </h1>

            <p className="mt-2 max-w-xl text-sm text-qahwa-muted">
              Crée et prépare les publications QAHWA pour les réseaux sociaux.
            </p>
          </div>
        </div>
      </div>

      {/* TITRE BIBLIOTHÈQUE */}
      <section className="mt-5 rounded-2xl border border-qahwa-border bg-qahwa-panel shadow-panel">
        <div className="border-b border-qahwa-border px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-qahwa-orange" />

                <h2 className="font-display text-lg uppercase tracking-wide text-qahwa-text">
                  Bibliothèque de modèles
                </h2>
              </div>

              <p className="text-sm text-qahwa-muted">
                Choisis un modèle pour commencer une nouvelle publication.
              </p>
            </div>

            <div className="rounded-xl border border-qahwa-border bg-qahwa-panel2 px-4 py-2">
              <span className="text-xs text-qahwa-muted">
                {templates.length} modèle
                {templates.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* CATÉGORIES */}
        <div className="border-b border-qahwa-border px-5 py-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((category) => {
              const active = selectedCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`whitespace-nowrap rounded-xl border px-4 py-2.5 text-xs font-medium transition ${
                    active
                      ? "border-qahwa-orange bg-qahwa-orange text-qahwa-noir"
                      : "border-qahwa-border bg-qahwa-panel2 text-qahwa-muted hover:border-qahwa-orange/50 hover:text-qahwa-text"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {/* CONTENU */}
        <div className="p-5">
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-2xl border border-qahwa-border bg-qahwa-panel2"
                >
                  <div className="aspect-square animate-pulse bg-qahwa-border/50" />

                  <div className="space-y-3 p-4">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-qahwa-border" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-qahwa-border" />
                    <div className="h-10 w-full animate-pulse rounded-xl bg-qahwa-border" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-6 w-6"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5" />
                  <path d="M12 16h.01" />
                </svg>
              </div>

              <h3 className="mt-4 font-display text-lg uppercase text-qahwa-text">
                Erreur
              </h3>

              <p className="mt-2 text-sm text-qahwa-muted">{error}</p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 rounded-xl border border-qahwa-orange bg-qahwa-orange px-5 py-3 font-display text-xs uppercase tracking-wide text-qahwa-noir transition hover:-translate-y-0.5"
              >
                Réessayer
              </button>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <div className="max-w-md text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-qahwa-border bg-qahwa-panel2 text-qahwa-orange">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    className="h-8 w-8"
                  >
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <circle cx="9" cy="9" r="1.5" />
                    <path d="m4 16 4-4 3 3 2-2 7 7" />
                  </svg>
                </div>

                <h3 className="mt-5 font-display text-lg uppercase tracking-wide text-qahwa-text">
                  Aucun modèle
                </h3>

                <p className="mt-2 text-sm leading-6 text-qahwa-muted">
                  Aucun modèle n'est disponible dans cette catégorie pour le
                  moment.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredTemplates.map((template) => {
                const isSquare =
                  template.width === template.height;

                return (
                  <article
                    key={template.id}
                    className="group overflow-hidden rounded-2xl border border-qahwa-border bg-qahwa-panel2 transition-all duration-200 hover:-translate-y-1 hover:border-qahwa-orange/50 hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
                  >
                    {/* APERÇU */}
                    <div
                      className={`relative overflow-hidden bg-qahwa-noir ${
                        isSquare ? "aspect-square" : "aspect-[9/16]"
                      }`}
                    >
                      {template.base_image_url ? (
                        <img
                          src={template.base_image_url}
                          alt={template.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-qahwa-orange/20 via-transparent to-transparent" />

                          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-qahwa-orange/10 blur-3xl" />

                          <div className="relative px-6 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-qahwa-orange/30 bg-qahwa-orange/10 text-qahwa-orange">
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                className="h-7 w-7"
                              >
                                <rect
                                  x="4"
                                  y="4"
                                  width="16"
                                  height="16"
                                  rx="2"
                                />
                                <circle cx="9" cy="9" r="1.5" />
                                <path d="m4 16 4-4 3 3 2-2 7 7" />
                              </svg>
                            </div>

                            <p className="mt-4 font-display text-sm uppercase tracking-wider text-qahwa-text">
                              {template.name}
                            </p>

                            <p className="mt-1 text-[10px] uppercase tracking-widest text-qahwa-muted">
                              Aperçu du modèle
                            </p>
                          </div>
                        </div>
                      )}

                      {/* FORMAT */}
                      <div className="absolute left-3 top-3 rounded-lg border border-white/10 bg-black/70 px-2.5 py-1.5 backdrop-blur">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-white">
                          {template.format}
                        </span>
                      </div>

                      {/* DIMENSIONS */}
                      <div className="absolute bottom-3 right-3 rounded-lg border border-white/10 bg-black/70 px-2.5 py-1.5 backdrop-blur">
                        <span className="text-[9px] text-white/80">
                          {template.width} × {template.height}
                        </span>
                      </div>
                    </div>

                    {/* INFOS */}
                    <div className="p-4">
                      <div className="mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-qahwa-orange">
                          {template.category}
                        </span>
                      </div>

                      <h3 className="font-display text-lg uppercase tracking-wide text-qahwa-text">
                        {template.name}
                      </h3>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {template.editable_elements
                          .slice(0, 4)
                          .map((element) => (
                            <span
                              key={`${template.id}-${element.type}`}
                              className="rounded-md border border-qahwa-border bg-qahwa-panel px-2 py-1 text-[9px] text-qahwa-muted"
                            >
                              {element.label}
                            </span>
                          ))}

                        {template.editable_elements.length > 4 && (
                          <span className="rounded-md border border-qahwa-border bg-qahwa-panel px-2 py-1 text-[9px] text-qahwa-muted">
                            +{template.editable_elements.length - 4}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUseTemplate(template)}
                        className="mt-5 flex w-full items-center justify-center rounded-xl border border-qahwa-orange bg-qahwa-orange px-4 py-3 font-display text-xs uppercase tracking-wide text-qahwa-noir transition hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(255,107,0,0.22)]"
                      >
                        Utiliser ce modèle
                        <span className="ml-2">→</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <div className="mt-5 flex flex-col justify-between gap-2 border-t border-qahwa-border pt-4 text-[10px] uppercase tracking-[0.16em] text-qahwa-muted sm:flex-row">
        <span>QAHWA · Studio</span>
        <span>Social Content</span>
      </div>
    </div>
  );
}