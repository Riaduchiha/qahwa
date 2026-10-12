import Link from "next/link";
import Image from "next/image";

function Domino404() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto flex h-28 w-20 -rotate-12 items-center justify-center rounded-2xl border-2 border-qahwa-orange bg-[#17120e] shadow-[8px_8px_0_#000] sm:h-36 sm:w-24"
    >
      <span className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-qahwa-orange/60" />
      <span className="absolute left-4 top-4 h-3 w-3 rounded-full bg-qahwa-orange sm:left-5 sm:top-5" />
      <span className="absolute right-4 top-4 h-3 w-3 rounded-full bg-qahwa-orange sm:right-5 sm:top-5" />
      <span className="absolute bottom-4 left-4 h-3 w-3 rounded-full bg-qahwa-orange sm:bottom-5 sm:left-5" />
      <span className="absolute bottom-4 right-4 h-3 w-3 rounded-full bg-qahwa-orange sm:bottom-5 sm:right-5" />
    </div>
  );
}

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-qahwa-noir px-5 py-12 text-qahwa-blanc">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[min(80vw,620px)] w-[min(80vw,620px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-qahwa-orange/[0.07] blur-3xl"
      />

      <section className="relative flex w-full max-w-xl flex-col items-center text-center">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-qahwa-orange">
          Qahwa · Oups
        </p>

       
<div className="mt-8">
  <Image
    src="/logo-white.png"
    alt="Qahwa"
    width={220}
    height={100}
    priority
    className="h-auto w-44 object-contain sm:w-52"
  />
</div>


        <p className="mt-9 font-display text-7xl leading-none text-qahwa-orange sm:text-8xl">
          404
        </p>

        <h1 className="mt-4 font-display text-2xl uppercase sm:text-3xl">
          Cette page a disparu.
        </h1>

        <p className="mt-4 max-w-md text-sm leading-6 text-qahwa-blanc/60 sm:text-base">
          On dirait que cette case n’existe pas sur le plateau. Retourne à l’accueil et reprends la partie.
        </p>

        <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-qahwa-orange px-7 py-3 text-sm font-bold uppercase tracking-wide text-qahwa-noir transition hover:bg-[#ff8129] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qahwa-orange focus-visible:ring-offset-4 focus-visible:ring-offset-qahwa-noir"
          >
            Retour à l’accueil
          </Link>

          <Link
            href="/play"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-7 py-3 text-sm font-bold uppercase tracking-wide text-qahwa-blanc transition hover:border-qahwa-orange hover:text-qahwa-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qahwa-orange focus-visible:ring-offset-4 focus-visible:ring-offset-qahwa-noir"
          >
            Qahwa Play
          </Link>
        </div>

        <p className="mt-10 text-[10px] uppercase tracking-[0.25em] text-qahwa-blanc/25">
          Une pause. Une partie. Qahwa.
        </p>
      </section>
    </main>
  );
}