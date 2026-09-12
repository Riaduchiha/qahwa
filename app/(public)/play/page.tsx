import Image from "next/image";
import Link from "next/link";

type GameCard = {
  slug: string;
  title: string;
  description: string;
};

const MODES: GameCard[] = [
  {
    slug: "solo",
    title: "Solo",
    description: "Pour patienter seul en attendant sa commande.",
  },
  {
    slug: "duo",
    title: "Deux joueurs",
    description: "Face a face, a deux sur la meme table.",
  },
  {
    slug: "groupe",
    title: "Groupe",
    description: "Plusieurs joueurs, tout le monde participe en meme temps.",
  },
];

export default function PlayPage() {
  return (
    <section className="min-h-screen bg-qahwa-noir pb-16">
      <div className="relative h-56 w-full overflow-hidden sm:h-72">
        <Image
          src="/play-hero-mobile.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center md:hidden"
        />
        <Image
          src="/play-hero-desktop.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="hidden object-cover object-center md:block"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-qahwa-noir/30 via-qahwa-noir/70 to-qahwa-noir" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
          <p className="font-display text-xs uppercase tracking-[0.3em] text-qahwa-orange">
            Qahwa
          </p>
          <h1 className="font-display text-5xl uppercase text-qahwa-blanc">
            PLAY
          </h1>
        </div>
      </div>

      <div className="px-5 text-center">
        <p className="mt-6 text-sm text-qahwa-blanc/60">
          Combien etes-vous ?
        </p>

        <div className="mx-auto mt-6 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
          {MODES.map((mode) => (
            <Link
              key={mode.slug}
              href={`/play/${mode.slug}`}
              className="rounded-2xl border-2 border-qahwa-blanc/15 bg-white/5 p-6 text-center transition hover:border-qahwa-orange hover:bg-white/[0.07]"
            >
              <h2 className="font-display text-2xl uppercase text-qahwa-blanc">
                {mode.title}
              </h2>
              <p className="mt-2 text-sm text-qahwa-blanc/60">
                {mode.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}