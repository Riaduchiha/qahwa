"use client";

import { useRouter } from "next/navigation";

const categories = [
  {
    category: "CONTENU",
    title: "Publication",
    subtitle: "Posts et contenus Qahwa",
    slug: "publication",
    format: "Instagram Portrait · 1080 × 1350 px",
    designs: [
      { id: "publication-premium", name: "Signature Qahwa", description: "Sobre, premium et élégant", style: "premium" },
      { id: "publication-editorial", name: "Éditorial végétal", description: "Typographie raffinée et composition aérée", style: "editorial" },
      { id: "publication-bold", name: "Impact", description: "Grand titre et contraste fort", style: "bold" },
    ],
  },
  {
    category: "PRODUIT",
    title: "Nouveau produit",
    subtitle: "Présente une nouveauté",
    slug: "nouveau-produit",
    format: "Instagram Portrait · 1080 × 1350 px",
    designs: [
      { id: "nouveau-produit-premium", name: "Nouveauté premium", description: "Mise en avant du produit", style: "premium" },
      { id: "nouveau-produit-editorial", name: "Atelier de création", description: "Ambiance éditoriale et soignée", style: "editorial" },
      { id: "nouveau-produit-bold", name: "Lancement fort", description: "Annonce directe et audacieuse", style: "bold" },
    ],
  },
  {
    category: "MARKETING",
    title: "Promotion",
    subtitle: "Offres et promotions",
    slug: "promotion",
    format: "Instagram Portrait · 1080 × 1350 px",
    designs: [
      { id: "promotion-premium", name: "Offre signature", description: "Promotion premium et épurée", style: "premium" },
      { id: "promotion-editorial", name: "Sélection du moment", description: "Style éditorial plus doux", style: "editorial" },
      { id: "promotion-bold", name: "Prix choc", description: "Réduction mise au premier plan", style: "bold" },
    ],
  },
  {
    category: "ÉVÉNEMENT",
    title: "Événement",
    subtitle: "Fêtes et occasions spéciales",
    slug: "evenement",
    format: "Instagram Story · 1080 × 1920 px",
    designs: [
      { id: "evenement-premium", name: "Invitation Qahwa", description: "Élégant pour vos annonces", style: "premium" },
      { id: "evenement-editorial", name: "Rendez-vous éditorial", description: "Atmosphère raffinée et calme", style: "editorial" },
      { id: "evenement-bold", name: "Annonce événement", description: "Date et message très visibles", style: "bold" },
    ],
  },
];

function DesignPreview({ style, title }: { style: string; title: string }) {
  const palette = style === "editorial"
    ? { background: "linear-gradient(155deg,#20332b,#0a100d)", ink: "#ffffff", muted: "rgba(255,255,255,.6)", line: "rgba(255,255,255,.55)" }
    : style === "bold"
      ? { background: "linear-gradient(150deg,#492b29,#120d0d 75%)", ink: "#ffffff", muted: "rgba(255,255,255,.65)", line: "#ffffff" }
      : { background: "linear-gradient(145deg,#303030,#080808 78%)", ink: "#ffffff", muted: "rgba(255,255,255,.6)", line: "rgba(255,255,255,.8)" };

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-white/10 p-3 sm:p-4" style={{ background: palette.background, color: palette.ink }}>
      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full border border-white/20" />
      <div className="absolute -right-2 -top-2 h-12 w-12 rounded-full border border-white/10" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between text-[7px] font-semibold uppercase tracking-[.2em] sm:text-[8px]">
          <span>QAHWA</span><span>STUDIO · 01</span>
        </div>
        <div className={`mt-auto ${style === "editorial" ? "text-center" : "text-left"}`}>
          <div className="mx-auto mb-2 h-px w-8" style={{ background: palette.line }} />
          <div className={`${style === "bold" ? "text-[clamp(17px,2.6vw,27px)] leading-[.9]" : style === "editorial" ? "font-serif text-[clamp(13px,2vw,21px)] leading-tight" : "text-[clamp(13px,2vw,20px)] leading-tight"} font-bold uppercase tracking-tight`}>
            {title}
          </div>
          <div className="mt-2 text-[7px] leading-relaxed sm:text-[8px]" style={{ color: palette.muted }}>
            UNE CRÉATION À PERSONNALISER
          </div>
          <div className="mt-3 inline-flex border px-2 py-1 text-[7px] font-bold uppercase tracking-[.12em] sm:text-[8px]" style={{ borderColor: palette.line }}>
            Découvrir
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-[6px] uppercase tracking-[.16em] sm:text-[7px]" style={{ color: palette.muted }}>
          <span>Qahwa · Coffee culture</span><span>01 / 01</span>
        </div>
      </div>
    </div>
  );
}

export default function StudioPage() {
  const router = useRouter();

  return (
    <main className="w-full pb-12">
      <div className="px-4 pt-7 sm:px-6 sm:pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">Création visuelle</p>
            <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-white">Qahwa Studio</h1>
            <p className="mt-2 max-w-2xl text-sm text-qahwa-muted">Choisis un modèle prêt à modifier. Chaque création s’ouvre dans ton éditeur habituel.</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/55">12 modèles · 4 catégories</div>
        </div>

        <div className="mt-9 space-y-10">
          {categories.map((category, index) => (
            <section key={category.slug}>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">{category.category} · 0{index + 1}</p>
                  <h2 className="mt-1 font-display text-xl font-bold uppercase tracking-tight text-white">{category.title}</h2>
                  <p className="mt-1 text-xs text-white/50">{category.subtitle}</p>
                </div>
                <span className="text-[9px] uppercase tracking-[0.13em] text-white/35">{category.format}</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {category.designs.map((design, designIndex) => (
                  <article key={design.id} className="group rounded-2xl border border-white/10 bg-[#121212] p-3 transition hover:border-white/30 hover:bg-[#171717]">
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                      <DesignPreview style={design.style} title={category.slug === "promotion" ? (design.style === "bold" ? "-20%" : "OFFRE SPÉCIALE") : category.slug === "nouveau-produit" ? (design.style === "bold" ? "NOUVEAU" : "NOUVELLE CRÉATION") : category.slug === "evenement" ? (design.style === "bold" ? "À VOS AGENDAS" : "RENDEZ-VOUS") : (design.style === "bold" ? "L'ART DU CAFÉ" : "PAUSE QAHWA")} />
                      <div className="flex min-w-0 flex-col py-1">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">Modèle 0{designIndex + 1}</span>
                        <h3 className="mt-2 text-sm font-semibold text-white">{design.name}</h3>
                        <p className="mt-2 text-xs leading-relaxed text-white/50">{design.description}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span className="rounded-full border border-white/10 px-2 py-1 text-[8px] uppercase tracking-[0.1em] text-white/50">{design.style === "premium" ? "Premium" : design.style === "editorial" ? "Éditorial" : "Audacieux"}</span>
                          <span className="rounded-full border border-white/10 px-2 py-1 text-[8px] uppercase tracking-[0.1em] text-white/50">Modifiable</span>
                        </div>
                        <button type="button" onClick={() => router.push(`/qahwa/studio/${category.slug}?design=${design.id}`)} className="mt-auto flex w-full items-center justify-between rounded-lg bg-white px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-black transition hover:bg-white/85">
                          Personnaliser <span aria-hidden="true" className="text-sm">↗</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
