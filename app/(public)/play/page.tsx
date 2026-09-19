import Image from "next/image";
import Link from "next/link";

export default function PlayWelcomePage() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-qahwa-noir">
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
      <div className="absolute inset-0 bg-gradient-to-b from-qahwa-noir/20 via-qahwa-noir/60 to-qahwa-noir" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-8 px-5 text-center">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.3em] text-qahwa-orange">
            Qahwa
          </p>
          <h1 className="font-display text-6xl uppercase text-qahwa-blanc">
            PLAY
          </h1>
          <p className="mt-3 text-sm text-qahwa-blanc/70">
            Un petit jeu pour patienter en attendant ta commande.
          </p>
        </div>

        <Link
          href="/play/modes"
          className="qahwa-cta rounded-full border-2 border-qahwa-noir bg-qahwa-orange px-10 py-4 font-display text-lg uppercase text-qahwa-noir shadow-brutal"
        >
          Play
        </Link>
      </div>
    </section>
  );
}