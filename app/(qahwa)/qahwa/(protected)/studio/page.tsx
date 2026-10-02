
"use client";

import Link from "next/link";

export default function StudioPage() {
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

          <Link
            href="/qahwa"
            className="w-fit rounded-xl border border-qahwa-border bg-qahwa-panel2 px-5 py-3 font-display text-xs uppercase tracking-wide text-qahwa-text transition hover:border-qahwa-orange hover:bg-qahwa-orange/5"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* ACTIONS PRINCIPALES */}
      <section className="mt-5 grid gap-5 md:grid-cols-2">
        {/* NOUVELLE PUBLICATION */}
        <div className="relative overflow-hidden rounded-2xl border border-qahwa-orange/30 bg-qahwa-panel p-6 shadow-panel">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-qahwa-orange/10 blur-3xl" />

          <div className="relative">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-qahwa-orange/10 text-qahwa-orange">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-6 w-6"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </div>

            <h2 className="font-display text-xl uppercase tracking-wide text-qahwa-text">
              Nouvelle publication
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-qahwa-muted">
              Choisis un modèle QAHWA et commence à créer une publication.
            </p>

            <button
              type="button"
              className="mt-6 rounded-xl border border-qahwa-orange bg-qahwa-orange px-5 py-3 font-display text-xs uppercase tracking-wide text-qahwa-noir transition hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(255,107,0,0.22)]"
            >
              Créer une publication
              <span className="ml-2">→</span>
            </button>
          </div>
        </div>

        {/* MODÈLES */}
        <div className="rounded-2xl border border-qahwa-border bg-qahwa-panel p-6 shadow-panel">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-qahwa-panel2 text-qahwa-orange">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-6 w-6"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>

          <h2 className="font-display text-xl uppercase tracking-wide text-qahwa-text">
            Modèles
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-qahwa-muted">
            Retrouve les modèles de publications disponibles pour QAHWA.
          </p>

          <button
            type="button"
            className="mt-6 rounded-xl border border-qahwa-border bg-qahwa-panel2 px-5 py-3 font-display text-xs uppercase tracking-wide text-qahwa-text transition hover:border-qahwa-orange hover:bg-qahwa-orange/5"
          >
            Voir les modèles
            <span className="ml-2">→</span>
          </button>
        </div>
      </section>

      {/* ESPACE DE TRAVAIL */}
      <section className="mt-5 rounded-2xl border border-qahwa-border bg-qahwa-panel shadow-panel">
        <div className="border-b border-qahwa-border px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-qahwa-orange" />

            <h2 className="font-display text-sm uppercase tracking-wide text-qahwa-text">
              Studio de création
            </h2>
          </div>

          <p className="mt-1 text-xs text-qahwa-muted">
            Ton espace de création apparaîtra ici.
          </p>
        </div>

        <div className="flex min-h-[280px] items-center justify-center p-6">
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
              Prêt à créer
            </h3>

            <p className="mt-2 text-sm leading-6 text-qahwa-muted">
              La bibliothèque de modèles et l'éditeur graphique seront ajoutés
              dans les prochaines étapes.
            </p>
          </div>
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

