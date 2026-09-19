import Link from "next/link";

type SoloGame = {
  slug: string;
  title: string;
  description: string;
  available: boolean;
  hue: string;
};

const SOLO_GAMES: SoloGame[] = [
  { slug: "chess", title: "Echecs", description: "Contre l'ordinateur, 3 niveaux de difficulte.", available: true, hue: "#FF6B00" },
  { slug: "2048", title: "2048", description: "Fusionnez les grains jusqu'a 2048.", available: true, hue: "#38BDF8" },
  { slug: "snake", title: "Snake", description: "Le classique, evite les murs et toi-meme.", available: true, hue: "#4ADE80" },
];

function GameIcon({ slug, size = 26 }: { slug: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (slug === "chess") {
    return (
      <svg {...common}>
        <circle cx="12" cy="6.5" r="2.2" />
        <path d="M9.5 11h5l1.5 6h-8z" />
        <path d="M8 20.5h8" />
      </svg>
    );
  }
  if (slug === "2048") {
    return (
      <svg {...common}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 8c0-2 1.5-3.5 3.5-3.5S11 6 11 8s-1.5 3.5-3.5 3.5H9c2 0 3.5 1.5 3.5 3.5S11 18.5 9 18.5H5" />
      <circle cx="16.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function PlaySoloPage() {
  return (
    <section className="min-h-screen bg-qahwa-noir px-5 py-10 text-center">
      <style>{`
        @keyframes qahwa-float { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-4px) rotate(-2deg); } }
        @keyframes qahwa-bg-float { 0%,100% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(-4px,-6px) rotate(6deg); } }
        @keyframes qahwa-glow-pulse { 0%,100% { box-shadow: 0 0 0 rgba(255,255,255,0); } 50% { box-shadow: 0 0 26px 2px var(--glow); } }
        @keyframes qahwa-shine { 0% { transform: translateX(-120%) skewX(-15deg); } 100% { transform: translateX(220%) skewX(-15deg); } }
        @keyframes qahwa-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }

        .qahwa-hero-card { position: relative; overflow: hidden; animation: qahwa-fade-up 0.5s ease both; }
        .qahwa-hero-card:nth-child(2) { animation-delay: 0.08s; }
        .qahwa-hero-card:nth-child(3) { animation-delay: 0.16s; }
        .qahwa-hero-card:hover { transform: translateY(-4px); animation: qahwa-glow-pulse 1.6s ease-in-out infinite; }
        .qahwa-hero-bg-icon { animation: qahwa-bg-float 6s ease-in-out infinite; opacity: 0.16; }
        .qahwa-hero-icon { animation: qahwa-float 3s ease-in-out infinite; }
        .qahwa-hero-shine {
          position: absolute; top: 0; left: 0; height: 100%; width: 40%;
          background: linear-gradient(120deg, transparent, rgba(255,255,255,0.22), transparent);
          pointer-events: none; transform: translateX(-120%) skewX(-15deg);
        }
        .qahwa-hero-card:hover .qahwa-hero-shine { animation: qahwa-shine 0.9s ease; }
      `}</style>

      <Link href="/play/modes" className="font-display text-xs uppercase text-qahwa-blanc/60 hover:text-qahwa-orange">
        &lsaquo; Retour
      </Link>
      <p className="mt-4 font-display text-xs uppercase tracking-[0.3em] text-qahwa-orange">Qahwa Play</p>
      <h1 className="font-display text-3xl uppercase text-qahwa-blanc">Solo</h1>

      <div className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3">
        {SOLO_GAMES.map((g) =>
          g.available ? (
            <Link
              key={g.slug}
              href={`/play/solo/${g.slug}`}
              className="qahwa-hero-card rounded-xl border-2 p-5 text-center shadow-brutal-sm transition-transform duration-200"
              style={
                {
                  borderColor: `${g.hue}66`,
                  background: `radial-gradient(120% 120% at 50% -10%, ${g.hue}33 0%, rgba(255,255,255,0.04) 55%, rgba(255,255,255,0.02) 100%)`,
                  ["--glow" as string]: `${g.hue}55`,
                } as React.CSSProperties
              }
            >
              <span className="qahwa-hero-bg-icon pointer-events-none absolute -right-3 -top-2" style={{ color: g.hue }}>
                <GameIcon slug={g.slug} size={90} />
              </span>
              <div className="qahwa-hero-shine" />

              <span className="qahwa-hero-icon relative z-10 flex items-center justify-center" style={{ color: g.hue }}>
                <GameIcon slug={g.slug} />
              </span>
              <h2 className="relative z-10 mt-2 font-display text-lg uppercase text-qahwa-blanc">{g.title}</h2>
              <p className="relative z-10 mt-1 text-xs text-qahwa-blanc/60">{g.description}</p>
            </Link>
          ) : (
            <div
              key={g.slug}
              className="rounded-xl border-2 border-qahwa-blanc/10 bg-white/[0.02] p-5 text-center opacity-50"
            >
              <span className="flex items-center justify-center text-qahwa-blanc/50">
                <GameIcon slug={g.slug} />
              </span>
              <h2 className="mt-2 font-display text-lg uppercase text-qahwa-blanc/60">{g.title}</h2>
              <p className="mt-1 text-xs text-qahwa-blanc/40">{g.description}</p>
            </div>
          )
        )}
      </div>
    </section>
  );
}