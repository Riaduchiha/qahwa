"use client";

import { useRouter } from "next/navigation";

const categories = [
  {
    category: "CONTENU",
    title: "Publication",
    subtitle: "Posts et contenus Qahwa",
    format: "Instagram Portrait",
    size: "1080 × 1350 px",
    image: "/studio/publication.jpg",
    slug: "publication",
  },
  {
    category: "PRODUIT",
    title: "Nouveau produit",
    subtitle: "Présente une nouveauté",
    format: "Instagram Portrait",
    size: "1080 × 1350 px",
    image: "/studio/nouveau-produit.jpg",
    slug: "nouveau-produit",
  },
  {
    category: "MARKETING",
    title: "Promotion",
    subtitle: "Offres et promotions",
    format: "Instagram Portrait",
    size: "1080 × 1350 px",
    image: "/studio/promotion.jpg",
    slug: "promotion",
  },
  {
    category: "ÉVÉNEMENT",
    title: "Événement",
    subtitle: "Fêtes et occasions spéciales",
    format: "Instagram Story",
    size: "1080 × 1920 px",
    image: "/studio/evenement.jpg",
    slug: "evenement",
  },
];

export default function StudioPage() {
  const router = useRouter();

  return (
    <main className="w-full">
      <div className="px-6 pt-8">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-white">
          Qahwa Studio
        </h1>

        <p className="mt-1 text-sm text-qahwa-muted">
          Crée et personnalise les visuels de Qahwa.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => (
            <div key={category.title}>
              <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-qahwa-muted">
                {category.category}
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(`/qahwa/studio/${category.slug}`)
                }
                className="group relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-white/10 text-left"
              >
                <img
                  src={category.image}
                  alt={category.title}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-white">
                    {category.title}
                  </h2>

                  <p className="mt-2 text-xs text-white/60">
                    {category.subtitle}
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.15em] text-white/70">
                    <span>{category.format}</span>
                    <span className="text-white/30">•</span>
                    <span>{category.size}</span>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}