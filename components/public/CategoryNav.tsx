"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/types/database";

export default function CategoryNav({
  categories,
}: {
  categories: Category[];
}) {
  const [active, setActive] = useState(categories[0]?.slug ?? "");

  useEffect(() => {
    const sections = categories
      .map((c) => document.getElementById(c.slug))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [categories]);

  function goTo(slug: string) {
    document.getElementById(slug)?.scrollIntoView({ behavior: "smooth" });
    setActive(slug);
  }

  return (
    <div className="sticky top-[64px] z-20 border-b border-qahwa-blanc/10 bg-qahwa-noir/95 backdrop-blur">
      <div
        className="flex gap-2 overflow-x-auto px-5 py-3"
        style={{ scrollbarWidth: "none" }}
      >
        {categories.map((category) => {
          const isActive = active === category.slug;
          const style = isActive
            ? "border-qahwa-orange bg-qahwa-orange text-qahwa-noir shadow-brutal-sm"
            : "border-qahwa-blanc/20 text-qahwa-blanc/60 hover:border-qahwa-orange/60 hover:text-qahwa-orange";
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => goTo(category.slug)}
              className={`shrink-0 rounded-full border px-4 py-2 font-display text-xs uppercase transition-all ${style}`}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}