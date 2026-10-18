"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/*
 * QAHWA STORY
 * Photos dans public/story/
 */

const STORY_IMAGES = {
  discovery: "/story/scene-01-discovery.jpg",
  firstStep: "/story/scene-02-first-step.jpg",
  firstImpression: "/story/scene-03-interior.jpg",
  firstOrder: "/story/scene-04-first-order.jpg",
  connection: "/story/scene-05-connection.jpg",
  regular: "/story/scene-06-regular.jpg",
};

const SCENES = [
  {
    chapter: "IT STARTS SOMEWHERE",
    title: "SOME PLACES FIND YOU.",
    text: "You weren't looking for anything special. Just passing by. Then something made you stop. Sometimes, the best places are the ones you never planned to find.",
    image: STORY_IMAGES.discovery,
    alt: "The QAHWA storefront in Hydra",
    position: "center center",
    accent: "01",
  },
  {
    chapter: "TAKE A STEP INSIDE",
    title: "ONE LITTLE STEP.",
    text: "A door opens. The outside world gets a little quieter. The atmosphere welcomes you before anyone even says hello.",
    image: STORY_IMAGES.firstStep,
    alt: "A customer opening the wooden door of QAHWA",
    position: "center center",
    accent: "02",
  },
  {
    chapter: "FEEL THE DIFFERENCE",
    title: "AND THEN, YOU FEEL IT.",
    text: "The music. The details. The smell of freshly made coffee. The energy of a place where every little thing has its own reason to be there.",
    image: STORY_IMAGES.firstImpression,
    alt: "The interior and atmosphere of QAHWA",
    position: "center center",
    accent: "03",
  },
  {
    chapter: "MAKE IT YOURS",
    title: "YOUR FIRST QAHWA.",
    text: "You find your drink. Take that first sip. Maybe it's the flavour, maybe it's the moment. Whatever it is, you already know you'll be back.",
    image: STORY_IMAGES.firstOrder,
    alt: "A QAHWA team member serving a customer's order",
    position: "center center",
    accent: "04",
  },
  {
    chapter: "GOOD PEOPLE. GOOD MOMENTS.",
    title: "YOU FOUND YOUR PEOPLE.",
    text: "One coffee turns into a conversation. A quick game turns into a challenge. Strangers become familiar faces, and ordinary afternoons become stories worth telling.",
    image: STORY_IMAGES.connection,
    alt: "Friends enjoying a game together at QAHWA",
    position: "center center",
    accent: "05",
  },
  {
    chapter: "IT FEELS LIKE YOUR PLACE",
    title: "YOU'RE NOT A STRANGER ANYMORE.",
    text: "They know your usual order. You know where you like to sit. You come for the coffee, stay for the atmosphere, and leave already thinking about your next visit.",
    image: STORY_IMAGES.regular,
    alt: "A regular customer enjoying their usual visit at QAHWA",
    position: "center center",
    accent: "06",
  },
] as const;

function StoryScene({
  scene,
  index,
}: {
  scene: (typeof SCENES)[number];
  index: number;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label={`${scene.chapter}: ${scene.title}`}
      className="qahwa-story-scene relative isolate flex min-h-[88svh] items-end overflow-hidden bg-qahwa-noir sm:min-h-[94svh] lg:min-h-[calc(100svh-64px)]"
    >
      {!imageFailed ? (
        <Image
          src={scene.image}
          alt={scene.alt}
          fill
          priority={index === 0}
          sizes="100vw"
          onError={() => setImageFailed(true)}
          className="z-0 object-cover transition-transform duration-[1800ms] ease-out motion-reduce:transition-none"
          style={{
            objectPosition: scene.position,
            transform: visible ? "scale(1)" : "scale(1.07)",
          }}
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_75%_30%,rgba(255,107,0,0.25),transparent_40%),radial-gradient(ellipse_at_15%_75%,rgba(255,107,0,0.10),transparent_35%),linear-gradient(135deg,#292019_0%,#171311_55%,#0A0A0A_100%)]"
        />
      )}

      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] bg-gradient-to-t from-qahwa-noir via-qahwa-noir/55 to-qahwa-noir/10"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] bg-gradient-to-r from-qahwa-noir/35 via-qahwa-noir/5 to-transparent"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(10,10,10,0.15)_0%,transparent_30%,transparent_65%,rgba(10,10,10,0.25)_100%)]"
      />

      <div
        className={`relative z-10 mx-auto flex w-full max-w-[1600px] items-end px-5 pb-9 pt-24 transition-all duration-700 sm:px-10 sm:pb-16 sm:pt-32 lg:px-16 lg:pb-20 lg:pt-36 ${
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-6 opacity-0"
        } motion-reduce:translate-y-0 motion-reduce:transition-none motion-reduce:opacity-100`}
      >
        <div className="max-w-5xl">
          <p className="mb-3 flex items-center gap-2 font-body text-[10px] font-bold uppercase tracking-[0.2em] text-qahwa-orange sm:mb-5 sm:gap-3 sm:text-xs sm:tracking-[0.25em] lg:text-sm">
            <span className="h-[2px] w-7 shrink-0 bg-qahwa-orange sm:w-10 lg:w-14" />
            {scene.chapter}
          </p>

          <h2 className="max-w-5xl font-display text-[clamp(2rem,7.5vw,3.5rem)] font-black uppercase leading-[0.95] tracking-[-0.045em] text-qahwa-blanc sm:text-6xl sm:leading-[0.9] lg:text-[clamp(4rem,7vw,7rem)]">
            {scene.title}
          </h2>

          <div className="mt-4 flex items-stretch gap-3 sm:mt-6 sm:gap-5 lg:mt-7">
            <span className="w-[2px] shrink-0 rounded-full bg-qahwa-orange sm:w-[3px]" />

            <p className="max-w-xl font-body text-sm font-medium leading-6 text-qahwa-blanc/90 sm:text-base sm:leading-7 lg:text-lg lg:leading-8">
              {scene.text}
            </p>
          </div>

          <Link
            href="/menu"
            className="group mt-5 inline-flex min-h-10 items-center gap-3 rounded-full border border-qahwa-blanc/25 bg-qahwa-noir/40 px-5 py-3 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-qahwa-blanc backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-qahwa-orange hover:bg-qahwa-orange hover:text-qahwa-noir focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-qahwa-orange motion-reduce:transition-none sm:mt-7 sm:min-h-12 sm:gap-4 sm:px-6 sm:py-4 sm:text-xs"
          >
            First QAHWA
            <span
              aria-hidden="true"
              className="text-sm transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5 motion-reduce:transition-none sm:text-base"
            >
              ↗
            </span>
          </Link>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="absolute bottom-0 left-5 right-5 z-10 h-px bg-qahwa-blanc/15 sm:left-10 sm:right-10 lg:left-16 lg:right-16"
      />
    </section>
  );
}

export default function StoryPage() {
  return (
    <main className="overflow-clip bg-qahwa-noir text-qahwa-blanc">
      {SCENES.map((scene, index) => (
        <div id={`scene-${scene.accent}`} key={scene.accent}>
          <StoryScene scene={scene} index={index} />
        </div>
      ))}
    </main>
  );
}