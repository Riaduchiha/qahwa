"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type EventItem = {
  id: string;
  title: string;
  event_date: string;
  recurring: boolean;
  type: string | null;
};

type EventColors = {
  text: string;
  dot: string;
  bar: string;
  iconBg: string;
};

function getEventColors(type: string | null): EventColors {
  const t = (type ?? "").toLowerCase();

  // Journée off / fermeture → rouge
  if (
    t.includes("off") ||
    t.includes("fermeture") ||
    t.includes("congé") ||
    t.includes("conge")
  ) {
    return {
      text: "text-red-400",
      dot: "bg-red-400",
      bar: "bg-red-500",
      iconBg: "bg-red-500/15",
    };
  }

  // Événement religieux → vert
  if (t.includes("religi")) {
    return {
      text: "text-emerald-400",
      dot: "bg-emerald-400",
      bar: "bg-emerald-500",
      iconBg: "bg-emerald-500/15",
    };
  }

  // Promotion → bleu
  if (t.includes("promo")) {
    return {
      text: "text-blue-400",
      dot: "bg-blue-400",
      bar: "bg-blue-500",
      iconBg: "bg-blue-500/15",
    };
  }

  // Anniversaire → rose
  if (t.includes("anniversaire")) {
    return {
      text: "text-pink-400",
      dot: "bg-pink-400",
      bar: "bg-pink-500",
      iconBg: "bg-pink-500/15",
    };
  }

  // Autre → violet
  return {
    text: "text-violet-400",
    dot: "bg-violet-400",
    bar: "bg-violet-500",
    iconBg: "bg-violet-500/15",
  };
}

function daysUntil(event: EventItem) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const date = new Date(
    event.event_date + "T00:00:00"
  );

  if (event.recurring) {
    date.setFullYear(now.getFullYear());

    if (date < now) {
      date.setFullYear(now.getFullYear() + 1);
    }
  }

  return Math.ceil(
    (date.getTime() - now.getTime()) / 86400000
  );
}

export default function EventAlert() {
  const [soon, setSoon] = useState<EventItem[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  const supabase = useMemo(
    () => createSupabaseBrowserClient(),
    []
  );

  useEffect(() => {
    async function check() {
      const { data } = await supabase
        .from("events")
        .select(
          "id, title, event_date, recurring, type"
        );

      const upcoming = (data ?? []).filter(
        (event: EventItem) => {
          const days = daysUntil(event);

          return days >= 0 && days <= 7;
        }
      );

      setSoon(upcoming);

      if (upcoming.length === 0) {
        setDismissed(false);
      }
    }

    check();

    const channel = supabase
      .channel("event-alert")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
        },
        check
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    if (soon.length > 0 && !dismissed) {
      const timer = setTimeout(
        () => setVisible(true),
        80
      );

      return () => clearTimeout(timer);
    }

    setVisible(false);
  }, [soon, dismissed]);

  if (dismissed || soon.length === 0) {
    return null;
  }

  const firstEvent = soon[0];
  const firstColors = getEventColors(
    firstEvent?.type ?? null
  );

  return (
    <div
      className={`w-[calc(100vw-24px)] max-w-[360px] overflow-hidden rounded-[20px] border border-white/20 bg-transparent shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[32px] backdrop-saturate-[180%] transition-all duration-500 ${
        visible
          ? "translate-y-0 scale-100 opacity-100"
          : "-translate-y-3 scale-[0.96] opacity-0"
      }`}
    >
      {/* Couleur de la catégorie principale */}
      <div
        className={`h-[2px] ${firstColors.bar}`}
      />

      <div className="flex items-start gap-3 px-3.5 py-3">
        {/* Icône */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${firstColors.iconBg}`}
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-[19px] w-[19px] ${firstColors.text}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect
              x="3"
              y="4"
              width="18"
              height="17"
              rx="3"
            />
            <path d="M16 2v4" />
            <path d="M8 2v4" />
            <path d="M3 10h18" />
            <path d="M8 14h.01" />
            <path d="M12 14h.01" />
            <path d="M16 14h.01" />
            <path d="M8 18h.01" />
            <path d="M12 18h.01" />
          </svg>
        </div>

        {/* Contenu */}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold tracking-tight text-white">
            Événement à venir
          </p>

          <div className="mt-1.5 space-y-2">
            {soon.slice(0, 3).map((event) => {
              const colors = getEventColors(event.type);
              const days = daysUntil(event);

              const percentage = Math.max(
                0,
                Math.min(
                  100,
                  ((7 - days) / 7) * 100
                )
              );

              return (
                <div
                  key={event.id}
                  className="space-y-1"
                >
                  <p
                    className={`flex items-center gap-1.5 truncate text-[12px] ${colors.text}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`}
                    />

                    <span className="truncate">
                      {event.title}
                    </span>

                    <span className="shrink-0 opacity-80">
                      ·{" "}
                      {days === 0
                        ? "aujourd'hui"
                        : `dans ${days} jour${
                            days > 1 ? "s" : ""
                          }`}
                    </span>
                  </p>

                  {/* Petite barre correspondant à la catégorie */}
                  <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {soon.length > 3 && (
              <p className="text-[11px] text-white/45">
                +{soon.length - 3} autre
                {soon.length - 3 > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {/* Fermer */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Fermer"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[15px] text-white/55 transition hover:bg-white/20 hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}