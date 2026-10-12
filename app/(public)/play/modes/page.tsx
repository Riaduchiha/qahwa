import Link from "next/link";

type GameMode = {
  slug: string;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  players: string;
};

const MODES: GameMode[] = [
  {
    slug: "solo",
    number: "01",
    title: "Solo",
    subtitle: "À ton rythme",
    description: "Une partie tranquille pour patienter et battre ton propre record.",
    players: "1 joueur",
  },
  {
    slug: "duo",
    number: "02",
    title: "Duo",
    subtitle: "Face à face",
    description: "Défie un ami et voyez qui maîtrise le mieux le jeu.",
    players: "2 joueurs",
  },
  {
    slug: "groupe",
    number: "03",
    title: "Groupes",
    subtitle: "Tous ensemble",
    description: "Réunissez-vous autour de la table et faites participer tout le monde.",
    players: "3 joueurs et +",
  },
];

function ModeIcon({ slug }: { slug: string }) {
  const common = {
    width: 34,
    height: 34,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
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
    <main className="relative min-h-screen overflow-hidden bg-qahwa-noir px-4 pb-16 pt-8 text-qahwa-blanc sm:px-6 sm:pt-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-80 w-[min(900px,120vw)] -translate-x-1/2 rounded-full bg-qahwa-orange/[0.08] blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl">
        <header className="flex flex-col items-center text-center">
          <Link
            href="/play"
            aria-label="Retour à Qahwa Play"
            className="mb-8 transition-opacity hover:opacity-75"
          >
            <DominoMark />
          </Link>

          <p className="text-xs font-bold uppercase tracking-[0.35em] text-qahwa-orange">
            Qahwa · Play
          </p>

          <h1 className="mt-3 font-display text-4xl uppercase leading-none sm:text-6xl">
            À toi de <span className="text-qahwa-orange">jouer.</span>
          </h1>

          <p className="mt-4 max-w-lg text-sm leading-6 text-qahwa-blanc/60 sm:text-base">
            Choisis ton mode, installe-toi et profite d’une petite partie pendant ta pause café.
          </p>
        </header>

        <section
          aria-label="Choisir un mode de jeu"
          className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4"
        >
          {MODES.map((mode) => (
            <Link
              key={mode.slug}
              href={`/play/${mode.slug}`}
              className="group relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#151515] p-5 text-left transition duration-200 hover:-translate-y-1 hover:border-qahwa-orange/70 hover:bg-[#1b1713] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qahwa-orange focus-visible:ring-offset-4 focus-visible:ring-offset-qahwa-noir sm:min-h-[245px] sm:p-5"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full border border-qahwa-orange/10 transition duration-300 group-hover:scale-110 group-hover:border-qahwa-orange/30"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-1 top-12 text-[88px] font-black leading-none text-white/[0.025]"
              >
                {mode.number}
              </div>

              <div className="relative flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-qahwa-orange/30 bg-qahwa-orange/10 text-qahwa-orange transition duration-200 group-hover:bg-qahwa-orange group-hover:text-qahwa-noir">
                  <ModeIcon slug={mode.slug} />
                </div>

                <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-qahwa-blanc/60">
                  {mode.players}
                </span>
              </div>

              <div className="relative mt-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-qahwa-orange">
                  {mode.subtitle}
                </p>

                <h2 className="mt-2 font-display text-2xl uppercase">
                  {mode.title}
                </h2>

                <p className="mt-3 max-w-xs text-sm leading-6 text-qahwa-blanc/55">
                  {mode.description}
                </p>
              </div>

              <div className="relative mt-auto flex items-center justify-between border-t border-white/[0.08] pt-5">
                <span className="text-xs font-bold uppercase tracking-wider text-qahwa-blanc/75">
                  Choisir ce mode
                </span>

                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-qahwa-orange text-lg text-qahwa-noir transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </div>
            </Link>
          ))}
        </section>

        <footer className="mt-10 text-center">
          <Link
            href="/play"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-qahwa-blanc/45 transition hover:text-qahwa-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qahwa-orange"
          >
            <span aria-hidden="true">←</span> Retour à l’accueil Play
          </Link>
        </footer>
      </div>
    </main>
  );
}