import Image from "next/image";
import Link from "next/link";

// Page d'accueil — direction visuelle définitive fournie par Imad (26/08) :
// noir/orange, néo-brutaliste, stickers flottants, logo qui respire,
// CTA avec halo pulsant + reflet animé. Premier test sur notre structure
// existante ; on ajustera ensuite selon le retour d'Imad.
export default function HomePage() {
  return (
    <section className="relative flex h-[calc(100dvh-64px)] flex-col items-center justify-center overflow-hidden bg-qahwa-noir px-5 text-qahwa-blanc">
      {/* Photo hero — plein écran, sans bordure ni recadrage visible (object-cover) */}
      <Image
        src="/hero-mobile.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover md:hidden"
      />
      <Image
        src="/hero-desktop.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="hidden object-cover md:block"
      />
      {/* Dégradé léger en bas uniquement, pour la lisibilité du texte */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-qahwa-noir/20 via-qahwa-noir/40 to-qahwa-noir/95" />

      {/* Stickers flottants */}
      <div
        className="qahwa-sticker absolute left-4 top-24 z-10 hidden rotate-[-6deg] rounded-lg border-2 border-qahwa-blanc bg-qahwa-orange px-3 py-2 text-xs font-display shadow-brutal sm:block"
        style={{ ["--sticker-tilt" as string]: "-6deg" }}
      >
        100% Hydra
      </div>
      <div
        className="qahwa-sticker absolute right-6 top-40 z-10 hidden rotate-[5deg] rounded-lg border-2 border-qahwa-orange bg-qahwa-noir px-3 py-2 text-xs font-display text-qahwa-orange shadow-brutal-orange sm:block"
        style={{ ["--sticker-tilt" as string]: "5deg", animationDelay: "0.6s" }}
      >
        Fresh daily
      </div>

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <Image
          src="/logo-white.png"
          alt="Qahwa"
          width={80}
          height={80}
          className="qahwa-logo-breathe mx-auto"
        />

        <h1 className="mt-8 font-display text-4xl uppercase leading-[1.05] tracking-tight sm:text-5xl">
          Qahwa n&apos;est pas
          <br />
          un simple coffeeshop
        </h1>

        <p className="mt-4 text-base text-qahwa-blanc/70">
          Rejoins le club de Qahwa, tu verras la différence.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4">
          <Link
            href="/menu"
            className="qahwa-cta rounded-xl border-2 border-qahwa-noir bg-qahwa-orange px-10 py-4 font-display text-lg uppercase text-qahwa-noir shadow-brutal"
          >
            Découvrir →
          </Link>

          <div className="flex gap-3">
            <Link
              href="/commander"
              className="rounded-lg border-2 border-qahwa-blanc bg-qahwa-noir px-5 py-2.5 font-display text-sm text-qahwa-blanc shadow-brutal-sm transition-transform hover:-translate-y-0.5"
            >
              Commander
            </Link>
            <Link
              href="/play"
              className="rounded-lg border-2 border-qahwa-noir bg-qahwa-blanc px-5 py-2.5 font-display text-sm text-qahwa-noir shadow-brutal-sm transition-transform hover:-translate-y-0.5"
            >
              PLAY
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
