import Link from "next/link";

type SoloGame = {
  slug: string;
  title: string;
  description: string;
  available: boolean;
};

const SOLO_GAMES: SoloGame[] = [
  {
    slug: "chess",
    title: "Echecs",
    description: "Contre l'ordinateur, 3 niveaux de difficulte.",
    available: true,
  },
  {
    slug: "2048",
    title: "2048",
    description: "Fusionnez les grains jusqu'a 2048.",
    available: true,
  },
  {
    slug: "morpion",
    title: "Morpion",
    description: "Bientot disponible.",
    available: true,
  },
];

export default function PlaySoloPage() {
  return (
    <section className="min-h-screen bg-qahwa-noir px-5 py-10 text-center">
      <Link
        href="/play"
        className="font-display text-xs uppercase text-qahwa-blanc/60 hover:text-qahwa-orange"
      >
        &lsaquo; Retour
      </Link>
      <p className="mt-4 font-display text-xs uppercase tracking-[0.3em] text-qahwa-orange">
        Qahwa Play
      </p>
      <h1 className="font-display text-4xl uppercase text-qahwa-blanc">
        Solo
      </h1>

      <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
        {SOLO_GAMES.map((g) =>
          g.available ? (
            <Link
              key={g.slug}
              href={`/play/solo/${g.slug}`}
              className="rounded-2xl border-2 border-qahwa-blanc/15 bg-white/5 p-6 text-center transition hover:border-qahwa-orange"
            >
              <h2 className="font-display text-xl uppercase text-qahwa-blanc">
                {g.title}
              </h2>
              <p className="mt-2 text-sm text-qahwa-blanc/60">
                {g.description}
              </p>
            </Link>
          ) : (
            <div
              key={g.slug}
              className="rounded-2xl border-2 border-qahwa-blanc/10 bg-white/[0.02] p-6 text-center opacity-50"
            >
              <h2 className="font-display text-xl uppercase text-qahwa-blanc/60">
                {g.title}
              </h2>
              <p className="mt-2 text-sm text-qahwa-blanc/40">
                {g.description}
              </p>
            </div>
          )
        )}
      </div>
    </section>
  );
}