import Link from "next/link";

type GameMode = {
  slug: string;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  players: string;
  hue: string;
};

const MODES: GameMode[] = [
  {
    slug: "solo",
    number: "01",
    title: "Solo",
    subtitle: "À ton rythme",
    description: "Joue contre toi-même ou l'ordinateur et bats tes records.",
    players: "1 joueur",
    hue: "#FF4FA3",
  },
  {
    slug: "duo",
    number: "02",
    title: "Duo",
    subtitle: "Face à face",
    description: "Défie un ami et découvrez qui maîtrise le mieux le jeu.",
    players: "2 joueurs",
    hue: "#38BDF8",
  },
  {
    slug: "groupe",
    number: "03",
    title: "Groupes",
    subtitle: "Tous ensemble",
    description: "Réunissez-vous autour d'une partie et jouez ensemble.",
    players: "3 joueurs et +",
    hue: "#4ADE80",
  },
];

function ModeIcon({
  slug,
  size = 26,
}: {
  slug: string;
  size?: number;
}) {
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
        <circle cx="12" cy="7.5" r="3.1" />
        <path d="M5.2 20c.4-3.7 2.8-6 6.8-6s6.4 2.3 6.8 6" />
      </svg>
    );
  }

  if (slug === "duo") {
    return (
      <svg {...common}>
        <circle cx="8" cy="7.5" r="2.7" />
        <circle cx="16" cy="7.5" r="2.7" />
        <path d="M2.8 19c.3-3.2 2.1-5 5.2-5 1.7 0 3 .6 3.9 1.7" />
        <path d="M21.2 19c-.3-3.2-2.1-5-5.2-5-1.7 0-3 .6-3.9 1.7" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="6.5" r="2.5" />
      <circle cx="5.3" cy="9" r="2.1" />
      <circle cx="18.7" cy="9" r="2.1" />
      <path d="M7.5 19c.2-3.3 1.8-5.2 4.5-5.2s4.3 1.9 4.5 5.2" />
      <path d="M1.8 19c.2-2.5 1.4-4 3.7-4 .9 0 1.7.3 2.3.8M22.2 19c-.2-2.5-1.4-4-3.7-4-.9 0-1.7.3-2.3.8" />
    </svg>
  );
}

function DominoMark() {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-12 w-8 -rotate-12 items-center justify-center rounded-lg border-2 border-qahwa-orange/80 bg-qahwa-orange/10 shadow-[4px_4px_0_#000]"
    >
      <span className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-qahwa-orange/70" />
      <span className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-qahwa-orange" />
      <span className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-qahwa-orange" />
      <span className="absolute bottom-1.5 left-1.5 h-1.5 w-1.5 rounded-full bg-qahwa-orange" />
    </div>
  );
}

export default function PlayModesPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-qahwa-noir px-5 pb-16 pt-8 text-center sm:px-8 sm:pt-12">
      <style>{`
        @keyframes qahwa-float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-4px) rotate(-2deg);
          }
        }

        @keyframes qahwa-bg-float {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
          }
          50% {
            transform: translate(-4px, -6px) rotate(6deg);
          }
        }

        @keyframes qahwa-glow-pulse {
          0%, 100% {
            box-shadow: 0 0 0 rgba(255,255,255,0);
          }
          50% {
            box-shadow: 0 0 26px 2px var(--glow);
          }
        }

        @keyframes qahwa-shine {
          0% {
            transform: translateX(-120%) skewX(-15deg);
          }
          100% {
            transform: translateX(220%) skewX(-15deg);
          }
        }

        @keyframes qahwa-fade-up {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .qahwa-mode-card {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          animation: qahwa-fade-up 0.5s ease both;
          -webkit-tap-highlight-color: transparent;
        }

        .qahwa-mode-card:nth-child(2) {
          animation-delay: 0.08s;
        }

        .qahwa-mode-card:nth-child(3) {
          animation-delay: 0.16s;
        }

        .qahwa-mode-card:hover {
          transform: translateY(-4px);
          animation: qahwa-glow-pulse 1.6s ease-in-out infinite;
        }

        .qahwa-mode-bg-icon {
          animation: qahwa-bg-float 6s ease-in-out infinite;
          opacity: 0.16;
        }

        .qahwa-mode-icon {
          animation: qahwa-float 3s ease-in-out infinite;
        }

        .qahwa-mode-shine {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 2;
          height: 100%;
          width: 40%;
          background: linear-gradient(
            120deg,
            transparent,
            rgba(255,255,255,0.22),
            transparent
          );
          pointer-events: none;
          transform: translateX(-120%) skewX(-15deg);
        }

        .qahwa-mode-card:hover .qahwa-mode-shine {
          animation: qahwa-shine 0.9s ease;
        }

        @media (prefers-reduced-motion: reduce) {
          .qahwa-mode-card,
          .qahwa-mode-bg-icon,
          .qahwa-mode-icon {
            animation: none;
          }

          .qahwa-mode-card:hover {
            animation: none;
            transform: none;
          }
        }
      `}</style>

      {/* Halo décoratif */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-80 w-[min(900px,120vw)] -translate-x-1/2 rounded-full bg-qahwa-orange/[0.08] blur-3xl"
      />

      <div className="relative mx-auto max-w-5xl">
        {/* En-tête */}
        <header className="flex flex-col items-center">
          <Link
            href="/play"
            aria-label="Retour à Qahwa Play"
            className="mb-7 transition-opacity hover:opacity-75 sm:mb-8"
          >
            <DominoMark />
          </Link>

          <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-qahwa-orange">
            Qahwa Play
          </p>

          <h1 className="mt-3 font-display text-4xl uppercase leading-none tracking-tight text-qahwa-blanc sm:text-6xl">
            À toi de <span className="text-qahwa-orange">jouer.</span>
          </h1>

          <p className="mt-4 max-w-lg text-sm leading-6 text-qahwa-blanc/60 sm:text-base">
            Choisis ton mode, installe-toi et profite d'une petite partie
            pendant ta pause café.
          </p>
        </header>

        {/* Cartes des modes */}
        <section
          aria-label="Choisir un mode de jeu"
          className="mx-auto mt-9 grid max-w-4xl grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-3"
        >
          {MODES.map((mode) => (
            <Link
              key={mode.slug}
              href={`/play/${mode.slug}`}
              className="qahwa-mode-card rounded-xl border-2 p-5 text-left shadow-brutal-sm transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qahwa-orange focus-visible:ring-offset-4 focus-visible:ring-offset-qahwa-noir sm:min-h-[255px] sm:p-5"
              style={
                {
                  borderColor: `${mode.hue}66`,
                  background: `radial-gradient(120% 120% at 50% -10%, ${mode.hue}33 0%, rgba(255,255,255,0.04) 55%, rgba(255,255,255,0.02) 100%)`,
                  ["--glow" as string]: `${mode.hue}55`,
                } as React.CSSProperties
              }
            >
              {/* Grande icône décorative */}
              <span
                aria-hidden="true"
                className="qahwa-mode-bg-icon pointer-events-none absolute -right-3 -top-2"
                style={{ color: mode.hue }}
              >
                <ModeIcon slug={mode.slug} size={90} />
              </span>

              {/* Reflet animé */}
              <div aria-hidden="true" className="qahwa-mode-shine" />

              {/* Numéro et nombre de joueurs */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <span
                  className="font-display text-xs font-bold tracking-[0.2em]"
                  style={{ color: mode.hue }}
                >
                  {mode.number}
                </span>

                <span
                  className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    borderColor: `${mode.hue}55`,
                    color: mode.hue,
                    backgroundColor: `${mode.hue}0D`,
                  }}
                >
                  {mode.players}
                </span>
              </div>

              {/* Icône principale */}
              <div
                className="qahwa-mode-icon relative z-10 mt-5 flex items-center justify-start"
                style={{ color: mode.hue }}
              >
                <ModeIcon slug={mode.slug} size={30} />
              </div>

              {/* Texte */}
              <div className="relative z-10 mt-3">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: mode.hue }}
                >
                  {mode.subtitle}
                </p>

                <h2 className="mt-2 font-display text-2xl uppercase text-qahwa-blanc">
                  {mode.title}
                </h2>

                <p className="mt-2 max-w-xs text-xs leading-5 text-qahwa-blanc/60 sm:text-[13px]">
                  {mode.description}
                </p>
              </div>

              {/* Bas de carte */}
              <div
                className="relative z-10 mt-5 flex items-center justify-between border-t pt-4"
                style={{ borderColor: `${mode.hue}30` }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-qahwa-blanc/75 sm:text-xs">
                  Choisir ce mode
                </span>

                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg transition-transform duration-200 group-hover:translate-x-1"
                  style={{
                    backgroundColor: mode.hue,
                    color: "#0A0A0A",
                  }}
                >
                  →
                </span>
              </div>
            </Link>
          ))}
        </section>

        {/* Retour */}
        <footer className="mt-10 text-center">
          <Link
            href="/play"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-qahwa-blanc/45 transition hover:text-qahwa-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qahwa-orange"
          >
            <span aria-hidden="true">←</span>
            Retour à l'accueil Play
          </Link>
        </footer>
      </div>
    </main>
  );
}