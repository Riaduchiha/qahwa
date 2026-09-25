"use client";

import { useMemo, useState } from "react";
import {
  createEvent,
  updateEvent,
  deleteEvent,
} from "./actions";

type EventItem = {
  id: string;
  title: string;
  event_date: string;
  type: string | null;
  notes: string | null;
  recurring: boolean;
};

function getEventColor(type: string | null) {
  const t = (type ?? "").toLowerCase();

  if (t.includes("anniversaire")) {
    return {
      dot: "bg-pink-400",
      text: "text-pink-300",
      badge: "bg-pink-400/15 text-pink-300",
      border: "border-pink-400/40",
      bg: "bg-pink-400/[0.12]",
      glow: "shadow-[0_0_20px_rgba(244,114,182,0.08)]",
    };
  }

  if (t.includes("religi")) {
    return {
      dot: "bg-emerald-400",
      text: "text-emerald-300",
      badge: "bg-emerald-400/15 text-emerald-300",
      border: "border-emerald-400/40",
      bg: "bg-emerald-400/[0.12]",
      glow: "shadow-[0_0_20px_rgba(52,211,153,0.08)]",
    };
  }

  if (t.includes("promo")) {
    return {
      dot: "bg-blue-400",
      text: "text-blue-300",
      badge: "bg-blue-400/15 text-blue-300",
      border: "border-blue-400/40",
      bg: "bg-blue-400/[0.12]",
      glow: "shadow-[0_0_20px_rgba(96,165,250,0.08)]",
    };
  }

  if (
    t.includes("off") ||
    t.includes("fermeture") ||
    t.includes("congé") ||
    t.includes("conge")
  ) {
    return {
      dot: "bg-red-400",
      text: "text-red-300",
      badge: "bg-red-400/15 text-red-300",
      border: "border-red-400/40",
      bg: "bg-red-400/[0.12]",
      glow: "shadow-[0_0_20px_rgba(248,113,113,0.08)]",
    };
  }

  return {
    dot: "bg-violet-400",
    text: "text-violet-300",
    badge: "bg-violet-400/15 text-violet-300",
    border: "border-violet-400/40",
    bg: "bg-violet-400/[0.12]",
    glow: "shadow-[0_0_20px_rgba(167,139,250,0.08)]",
  };
}

const inputClass =
  "w-full rounded-xl border border-qahwa-border bg-qahwa-panel2 px-3.5 py-3 text-sm text-qahwa-text placeholder:text-qahwa-muted focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/10";

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const DAYS = [
  "Lun",
  "Mar",
  "Mer",
  "Jeu",
  "Ven",
  "Sam",
  "Dim",
];

function eventOccursOn(
  ev: EventItem,
  year: number,
  month: number,
  day: number
) {
  const d = new Date(ev.event_date + "T00:00:00");

  if (ev.recurring) {
    return (
      d.getMonth() === month &&
      d.getDate() === day
    );
  }

  return (
    d.getFullYear() === year &&
    d.getMonth() === month &&
    d.getDate() === day
  );
}

export default function EventsCalendar({
  initialEvents,
}: {
  initialEvents: EventItem[];
}) {
  const [events, setEvents] = useState(initialEvents);

  const today = new Date();

  const [viewYear, setViewYear] = useState(
    today.getFullYear()
  );

  const [viewMonth, setViewMonth] = useState(
    today.getMonth()
  );

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [editingEvent, setEditingEvent] =
    useState<EventItem | null>(null);

  const [form, setForm] = useState({
    title: "",
    event_date: "",
    type: "",
    notes: "",
    recurring: false,
  });

  function openAddModal(dateStr?: string) {
    setEditingEvent(null);

    setForm({
      title: "",
      event_date: dateStr ?? "",
      type: "",
      notes: "",
      recurring: false,
    });

    setIsModalOpen(true);
  }

  function openEditModal(ev: EventItem) {
    setEditingEvent(ev);

    setForm({
      title: ev.title,
      event_date: ev.event_date,
      type: ev.type ?? "",
      notes: ev.notes ?? "",
      recurring: ev.recurring,
    });

    setIsModalOpen(true);
  }

  async function handleSave(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (editingEvent) {
      await updateEvent(
        editingEvent.id,
        form
      );

      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === editingEvent.id
            ? {
                ...ev,
                ...form,
              }
            : ev
        )
      );
    } else {
      await createEvent(form);
      location.reload();
    }

    setIsModalOpen(false);
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Supprimer cet événement ?"
      )
    ) {
      return;
    }

    await deleteEvent(id);

    setEvents((prev) =>
      prev.filter((ev) => ev.id !== id)
    );
  }

  const grid = useMemo(() => {
    const firstOfMonth = new Date(
      viewYear,
      viewMonth,
      1
    );

    const startWeekday =
      (firstOfMonth.getDay() + 6) % 7;

    const daysInMonth = new Date(
      viewYear,
      viewMonth + 1,
      0
    ).getDate();

    const cells: (number | null)[] = [];

    for (
      let i = 0;
      i < startWeekday;
      i++
    ) {
      cells.push(null);
    }

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {
      cells.push(day);
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((year) => year - 1);
    } else {
      setViewMonth(
        (month) => month - 1
      );
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((year) => year + 1);
    } else {
      setViewMonth(
        (month) => month + 1
      );
    }
  }

  function goToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  const upcoming = useMemo(() => {
    const now = new Date();

    now.setHours(0, 0, 0, 0);

    return events
      .map((ev) => {
        const d = new Date(
          ev.event_date + "T00:00:00"
        );

        if (ev.recurring) {
          d.setFullYear(
            now.getFullYear()
          );

          if (d < now) {
            d.setFullYear(
              now.getFullYear() + 1
            );
          }
        }

        return {
          ev,
          date: d,
        };
      })
      .filter(({ date }) => date >= now)
      .sort(
        (a, b) =>
          a.date.getTime() -
          b.date.getTime()
      )
      .slice(0, 5);
  }, [events]);

  return (
    <div className="space-y-5 text-qahwa-text">
      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-white/80" />

            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-qahwa-muted">
              Planning
            </p>
          </div>

          <h2 className="mt-2 font-display text-2xl uppercase tracking-tight sm:text-3xl">
            Calendrier
          </h2>

          <p className="mt-1 text-sm text-qahwa-muted">
            Anniversaires, fêtes et occasions spéciales
          </p>
        </div>

        <button
          type="button"
          onClick={() => openAddModal()}
          className="w-full rounded-xl bg-white px-4 py-3 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-white/90 sm:w-auto"
        >
          + Ajouter un événement
        </button>
      </div>

      {/* CALENDRIER */}

      <div className="overflow-hidden rounded-2xl border border-qahwa-border bg-qahwa-panel shadow-panel">
        {/* BARRE CALENDRIER */}

        <div className="flex flex-col gap-4 border-b border-qahwa-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-qahwa-muted">
              Mois actuel
            </p>

            <h3 className="mt-1 font-display text-xl uppercase">
              {MONTHS[viewMonth]}{" "}
              {viewYear}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToday}
              className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-qahwa-muted transition hover:text-white"
            >
              Aujourd'hui
            </button>

            <button
              type="button"
              onClick={prevMonth}
              aria-label="Mois précédent"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-qahwa-border bg-qahwa-panel2 text-sm text-qahwa-muted transition hover:border-white/20 hover:text-white"
            >
              ←
            </button>

            <button
              type="button"
              onClick={nextMonth}
              aria-label="Mois suivant"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-qahwa-border bg-qahwa-panel2 text-sm text-qahwa-muted transition hover:border-white/20 hover:text-white"
            >
              →
            </button>
          </div>
        </div>

        {/* LEGEND */}

        <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-qahwa-border px-4 py-3 sm:px-5">
          <span className="flex items-center gap-1.5 text-[10px] text-qahwa-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
            Anniversaire
          </span>

          <span className="flex items-center gap-1.5 text-[10px] text-qahwa-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Religieux
          </span>

          <span className="flex items-center gap-1.5 text-[10px] text-qahwa-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            Promo
          </span>

          <span className="flex items-center gap-1.5 text-[10px] text-qahwa-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            Journée off
          </span>

          <span className="flex items-center gap-1.5 text-[10px] text-qahwa-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            Autre
          </span>
        </div>

        {/* DAYS */}

        <div className="grid grid-cols-7 border-b border-qahwa-border bg-black/10">
          {DAYS.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-[9px] font-semibold uppercase tracking-wider text-qahwa-muted sm:text-[10px]"
            >
              {day}
            </div>
          ))}
        </div>

        {/* GRID */}

        <div className="grid grid-cols-7 gap-px bg-qahwa-border">
          {grid.map((day, idx) => {
            if (day === null) {
              return (
                <div
                  key={idx}
                  className="min-h-[72px] bg-qahwa-panel/60 sm:min-h-[100px]"
                />
              );
            }

            const dayEvents =
              events.filter((ev) =>
                eventOccursOn(
                  ev,
                  viewYear,
                  viewMonth,
                  day
                )
              );

            const isToday =
              day === today.getDate() &&
              viewMonth ===
                today.getMonth() &&
              viewYear ===
                today.getFullYear();

            const dateStr = `${viewYear}-${String(
              viewMonth + 1
            ).padStart(2, "0")}-${String(
              day
            ).padStart(2, "0")}`;

            const firstEvent = dayEvents[0];
            const dayColor = firstEvent
              ? getEventColor(firstEvent.type)
              : null;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  const first =
                    dayEvents[0];

                  if (first) {
                    openEditModal(first);
                  } else {
                    openAddModal(dateStr);
                  }
                }}
                className={`group relative min-h-[72px] overflow-hidden border p-1.5 text-left transition sm:min-h-[100px] sm:p-2 ${
                  dayColor
                    ? `${dayColor.bg} ${dayColor.border} ${dayColor.glow}`
                    : "border-transparent bg-qahwa-panel"
                } ${
                  isToday
                    ? "ring-1 ring-inset ring-white/70"
                    : ""
                } ${
                  dayColor
                    ? "hover:brightness-125"
                    : "hover:bg-qahwa-panel2"
                }`}
              >
                {/* TODAY */}

                {isToday && (
                  <span
                    className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.7)] sm:right-2 sm:top-2 ${
                      dayColor
                        ? dayColor.dot
                        : "bg-white"
                    }`}
                  />
                )}

                {/* NUMBER */}

                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-semibold sm:h-6 sm:w-6 sm:text-[11px] ${
                    isToday
                      ? "bg-white text-black"
                      : dayColor
                      ? dayColor.text
                      : "text-qahwa-muted group-hover:text-white"
                  }`}
                >
                  {day}
                </div>

                {/* EVENTS */}

                <div className="mt-1 space-y-1">
                  {dayEvents
                    .slice(0, 2)
                    .map((ev) => {
                      const color =
                        getEventColor(
                          ev.type
                        );

                      return (
                        <div
                          key={ev.id}
                          className={`flex items-center gap-1 rounded-md px-1.5 py-1 text-[8px] ${color.badge} sm:text-[9px]`}
                        >
                          <span
                            className={`h-1 w-1 shrink-0 rounded-full ${color.dot}`}
                          />

                          <span className="truncate">
                            {ev.title}
                          </span>
                        </div>
                      );
                    })}

                  {dayEvents.length >
                    2 && (
                    <p
                      className={`px-1 text-[8px] ${
                        dayColor
                          ? dayColor.text
                          : "text-qahwa-muted"
                      }`}
                    >
                      +
                      {dayEvents.length -
                        2}{" "}
                      autres
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* PROCHAINS ÉVÉNEMENTS */}

      <div className="rounded-2xl border border-qahwa-border bg-qahwa-panel shadow-panel">
        <div className="border-b border-qahwa-border px-4 py-4 sm:px-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-qahwa-muted">
            À venir
          </p>

          <h3 className="mt-1 font-display text-lg uppercase">
            Prochains événements
          </h3>
        </div>

        {upcoming.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-qahwa-muted">
              Aucun événement à venir
            </p>
          </div>
        ) : (
          <div className="divide-y divide-qahwa-border">
            {upcoming.map(
              ({ ev, date }) => {
                const now = new Date();
                now.setHours(
                  0,
                  0,
                  0,
                  0
                );

                const daysLeft =
                  Math.ceil(
                    (date.getTime() -
                      now.getTime()) /
                      86400000
                  );

                const color =
                  getEventColor(
                    ev.type
                  );

                return (
                  <div
                    key={ev.id}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${color.badge}`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${color.dot}`}
                        />
                      </div>

                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm font-semibold ${color.text}`}
                        >
                          {ev.title}
                        </p>

                        <p className="mt-0.5 text-[11px] text-qahwa-muted">
                          {date.toLocaleDateString(
                            "fr-FR",
                            {
                              day: "numeric",
                              month: "long",
                            }
                          )}

                          {ev.recurring &&
                            " · Chaque année"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${color.badge}`}
                      >
                        {daysLeft === 0
                          ? "Aujourd'hui"
                          : `J-${daysLeft}`}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(
                            ev
                          )
                        }
                        className="text-[11px] font-semibold text-qahwa-muted transition hover:text-white"
                      >
                        Modifier
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            ev.id
                          )
                        }
                        className="text-[11px] font-semibold text-red-400 transition hover:text-red-300"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* MODAL */}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <form
            onSubmit={handleSave}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-qahwa-panel p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-qahwa-muted">
                  Calendrier
                </p>

                <h3 className="mt-1 font-display text-xl uppercase">
                  {editingEvent
                    ? "Modifier l'événement"
                    : "Nouvel événement"}
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsModalOpen(false)
                }
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-qahwa-muted">
                  Titre
                </label>

                <input
                  required
                  className={`${inputClass} mt-1.5`}
                  value={form.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title: e.target.value,
                    })
                  }
                  placeholder="Ex : Ramadan, Anniversaire Sarah..."
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-qahwa-muted">
                  Date
                </label>

                <input
                  required
                  type="date"
                  className={`${inputClass} mt-1.5`}
                  value={form.event_date}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      event_date:
                        e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-qahwa-muted">
                  Type
                </label>

                <input
                  className={`${inputClass} mt-1.5`}
                  value={form.type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: e.target.value,
                    })
                  }
                  placeholder="anniversaire, religieux, promo..."
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-qahwa-muted">
                  Notes
                </label>

                <textarea
                  rows={3}
                  className={`${inputClass} mt-1.5 resize-none`}
                  value={form.notes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Informations supplémentaires..."
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-qahwa-border bg-qahwa-panel2 p-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-white"
                  checked={form.recurring}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      recurring:
                        e.target.checked,
                    })
                  }
                />

                <span>
                  <span className="block text-xs font-semibold text-white">
                    Événement annuel
                  </span>

                  <span className="mt-0.5 block text-[10px] text-qahwa-muted">
                    Se répète chaque année
                  </span>
                </span>
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              {editingEvent ? (
                <button
                  type="button"
                  onClick={() => {
                    handleDelete(
                      editingEvent.id
                    );
                    setIsModalOpen(false);
                  }}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold uppercase text-red-400 transition hover:bg-red-500/15"
                >
                  Supprimer
                </button>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setIsModalOpen(false)
                  }
                  className="flex-1 rounded-xl border border-qahwa-border bg-qahwa-panel2 px-4 py-3 text-xs font-bold uppercase text-qahwa-muted transition hover:text-white sm:flex-none"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-white px-5 py-3 text-xs font-bold uppercase text-black transition hover:bg-white/90 sm:flex-none"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}