"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Adresses de tes pages admin. Change-les ici si une adresse est différente.
const SECTIONS = [
  { key: "stock", label: "Stock", src: "/qahwa/stock" },
  { key: "commandes", label: "Commandes", src: "/qahwa/commandes" },
  { key: "menu", label: "Gestion menu", src: "/qahwa/menu" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export function CaisseToolbar() {
  const [open, setOpen] = useState<SectionKey | null>(null);
  const [loaded, setLoaded] = useState(false);

  const section = SECTIONS.find((item) => item.key === open) ?? null;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Image
            src="/logo-white.png"
            alt=""
            width={36}
            height={36}
            priority
            className="h-9 w-9 object-contain"
          />
          <h1 className="font-display text-3xl uppercase">Qahwa Caisse</h1>
        </div>

        <nav aria-label="Raccourcis" className="flex flex-wrap gap-2">
          {SECTIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setLoaded(false);
                setOpen(item.key);
              }}
              className="min-h-[44px] rounded-xl border border-qahwa-border bg-qahwa-panel2 px-4 font-display text-xs uppercase text-qahwa-text transition hover:border-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {section && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={section.label}
          className="fixed inset-0 z-[80] flex flex-col bg-qahwa-bg"
        >
          <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-qahwa-border bg-qahwa-panel px-4">
            <h2 className="font-display text-lg uppercase text-qahwa-text">{section.label}</h2>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="min-h-[40px] rounded-lg border border-white bg-white px-4 font-display text-xs uppercase text-qahwa-noir transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Retour à la caisse
            </button>
          </div>

          <div className="relative min-h-0 flex-1">
            {!loaded && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-qahwa-muted">
                Chargement...
              </p>
            )}
            <iframe
              key={section.key}
              src={section.src}
              title={section.label}
              onLoad={() => setLoaded(true)}
              className="h-full w-full border-0"
            />
          </div>
        </div>
      )}
    </>
  );
}