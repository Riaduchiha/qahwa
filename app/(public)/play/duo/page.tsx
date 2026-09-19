import Link from "next/link";

type DuoGame = { slug: string; title: string; description: string; hue: string };

const DUO_GAMES: DuoGame[] = [
  { slug: "mot-mystere", title: "Mot Mystere", description: "Decris le mot a ton binome sans le dire.", hue: "#38BDF8" },
  { slug: "echecs", title: "Echecs", description: "Face a face, une partie classique en duo.", hue: "#FF6B00" },
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
  if (slug === "echecs") {
    return (
      <svg {...common}>
        <circle cx="12" cy="6.5" r="2.2" />
        <path d="M9.5 11h5l1.5 6h-8z" />
        <path d="M8 20.5h8" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <circle cx="12" cy="12" r="5" />
    </svg>
  );
}

export default function PlayDuoPage() {
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
      <h1 className="font-display text-3xl uppercase text-qahwa-blanc">Deux joueurs</h1>

      <div className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
        {DUO_GAMES.map((g) => (
          <Link
            key={g.slug}
            href={`/play/duo/${g.slug}`}
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
        ))}
      </div>
    </section>
  );
}