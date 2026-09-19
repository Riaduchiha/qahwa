import Link from "next/link";

type GameCard = {
  slug: string;
  title: string;
  description: string;
  players: string;
  hue: string; // couleur d'accent
};

const MODES: GameCard[] = [
  { slug: "solo", title: "Solo", description: "Pour patienter seul en attendant sa commande.", players: "1 joueur", hue: "#FF6B00" },
  { slug: "duo", title: "Deux joueurs", description: "Face a face, a deux sur la meme table.", players: "2 joueurs", hue: "#38BDF8" },
  { slug: "groupe", title: "Groupe", description: "Plusieurs joueurs, tout le monde participe en meme temps.", players: "3+ joueurs", hue: "#F472B6" },
];

function ModeIcon({ slug, size = 28 }: { slug: string; size?: number }) {
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

  if (slug === "solo") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      </svg>
    );
  }
  if (slug === "duo") {
    return (
      <svg {...common}>
        <circle cx="8.5" cy="8" r="2.8" />
        <circle cx="15.5" cy="8" r="2.8" />
        <path d="M3 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
        <path d="M10 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="7" cy="7.5" r="2.3" />
      <circle cx="17" cy="7.5" r="2.3" />
      <circle cx="12" cy="6" r="2.3" />
      <path d="M2.5 19c0-2.7 2-4.5 4.5-4.5S11.5 16.3 11.5 19" />
      <path d="M12.5 19c0-2.7 2-4.5 4.5-4.5S21.5 16.3 21.5 19" />
    </svg>
  );
}

export default function PlayModesPage() {
  return (
    <section className="min-h-screen bg-qahwa-noir pb-16">
      <style>{`
        @keyframes qahwa-float { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-4px) rotate(-2deg); } }
        @keyframes qahwa-bg-float { 0%,100% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(-4px,-6px) rotate(6deg); } }
        @keyframes qahwa-glow-pulse { 0%,100% { box-shadow: 0 0 0 rgba(255,255,255,0); } 50% { box-shadow: 0 0 26px 2px var(--glow); } }
        @keyframes qahwa-shine { 0% { transform: translateX(-120%) skewX(-15deg); } 100% { transform: translateX(220%) skewX(-15deg); } }
        @keyframes qahwa-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }

        .qahwa-hero-card {
          position: relative;
          overflow: hidden;
          animation: qahwa-fade-up 0.5s ease both;
        }
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

      <div className="relative h-44 w-full overflow-hidden sm:h-56">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(120% 100% at 50% 0%, #241a12 0%, #0A0A0A 65%)" }}
        />
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
          <p className="font-display text-xs uppercase tracking-[0.3em] text-qahwa-orange">Qahwa</p>
          <h1 className="font-display text-4xl uppercase text-qahwa-blanc">PLAY</h1>
        </div>
      </div>

      <div className="px-5 text-center">
        <p className="mt-5 text-sm text-qahwa-blanc/60">Combien etes-vous ?</p>

        <div className="mx-auto mt-5 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3">
          {MODES.map((mode) => (
            <Link
              key={mode.slug}
              href={`/play/${mode.slug}`}
              className="qahwa-hero-card rounded-xl border-2 p-5 text-center shadow-brutal-sm transition-transform duration-200"
              style={
                {
                  borderColor: `${mode.hue}66`,
                  background: `radial-gradient(120% 120% at 50% -10%, ${mode.hue}33 0%, rgba(255,255,255,0.04) 55%, rgba(255,255,255,0.02) 100%)`,
                  ["--glow" as string]: `${mode.hue}55`,
                } as React.CSSProperties
              }
            >
              <span
                className="qahwa-hero-bg-icon pointer-events-none absolute -right-3 -top-2 text-qahwa-blanc"
                style={{ color: mode.hue }}
              >
                <ModeIcon slug={mode.slug} size={90} />
              </span>
              <div className="qahwa-hero-shine" />

              <span
                className="qahwa-hero-icon relative z-10 flex items-center justify-center"
                style={{ color: mode.hue }}
              >
                <ModeIcon slug={mode.slug} />
              </span>
              <h2 className="relative z-10 mt-2 font-display text-lg uppercase text-qahwa-blanc">{mode.title}</h2>
              <p className="relative z-10 mt-1 text-xs text-qahwa-blanc/60">{mode.description}</p>
              <span
                className="relative z-10 mt-2 inline-block rounded-full border px-2.5 py-0.5 text-[9px] uppercase tracking-wide text-qahwa-blanc/80"
                style={{ borderColor: `${mode.hue}55`, background: `${mode.hue}22` }}
              >
                {mode.players}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}