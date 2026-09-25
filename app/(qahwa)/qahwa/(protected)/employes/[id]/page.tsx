
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { addAdvance, deleteAdvance } from "../actions";

interface Employee {
  id: string;
  name: string;
  position: string;
  phone: string;
  salary: number;
  code: string;
  photo_url: string | null;
  active: boolean;
}

interface ClockEvent {
  id: string;
  event_type: "in" | "out";
  photo_url: string | null;
  created_at: string;
}

interface Advance {
  id: string;
  amount: number;
  note: string | null;
  advance_date: string;
}

interface Schedule {
  day_of_week: number;
  start_time: string;
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#161616] px-3 py-2.5 text-sm text-qahwa-text placeholder:text-qahwa-muted focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10";

const GRACE_MINUTES = 10;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDay(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayOfWeekFromDate(dateStr: string) {
  const jsDay = new Date(dateStr).getDay();
  return (jsDay + 6) % 7;
}

function timeToMinutes(t: string) {
  const parts = t.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}

function isLate(eventDateStr: string, scheduleStartTime: string) {
  const d = new Date(eventDateStr);
  const eventMinutes = d.getHours() * 60 + d.getMinutes();
  const scheduleMinutes = timeToMinutes(scheduleStartTime.slice(0, 5));
  return eventMinutes > scheduleMinutes + GRACE_MINUTES;
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [clockEvents, setClockEvents] = useState<ClockEvent[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [advanceDate, setAdvanceDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const loadAll = useCallback(async () => {
    const { data: emp } = await supabase
      .from("employees")
      .select("*")
      .eq("id", employeeId)
      .single();

    if (emp) setEmployee(emp as Employee);

    const { data: events } = await supabase
      .from("employee_clock_events")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })
      .limit(40);

    if (events) setClockEvents(events as ClockEvent[]);

    const { data: schedData } = await supabase
      .from("employee_schedules")
      .select("day_of_week, start_time")
      .eq("employee_id", employeeId);

    if (schedData) setSchedules(schedData as Schedule[]);

    const { data: adv } = await supabase
      .from("employee_advances")
      .select("*")
      .eq("employee_id", employeeId)
      .order("advance_date", { ascending: false });

    if (adv) setAdvances(adv as Advance[]);
  }, [supabase, employeeId]);

  useEffect(() => {
    loadAll();

    const channel = supabase
      .channel(`employee-detail-${employeeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "employee_clock_events",
        },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "employee_advances",
        },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "employee_schedules",
        },
        () => loadAll()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  async function handleAddAdvance(e: React.FormEvent) {
    e.preventDefault();

    if (amount <= 0) return;

    setSaving(true);

    const res = await addAdvance(
      employeeId,
      amount,
      note,
      advanceDate
    );

    if (res && !res.success) {
      alert("Erreur : " + res.error);
    }

    setAmount(0);
    setNote("");

    await loadAll();

    setSaving(false);
  }

  async function handleDeleteAdvance(id: string) {
    if (confirm("Supprimer cet acompte ?")) {
      try {
        await deleteAdvance(id);
        await loadAll();
      } catch (err: any) {
        alert("Erreur : " + err.message);
      }
    }
  }

  function eventStatus(ev: ClockEvent) {
    if (ev.event_type !== "in") return null;

    const day = dayOfWeekFromDate(ev.created_at);

    const sched = schedules.find(
      (s) => s.day_of_week === day
    );

    if (!sched) return "unknown";

    return isLate(ev.created_at, sched.start_time)
      ? "late"
      : "ontime";
  }

  if (!employee) {
    return (
      <div className="p-6 text-sm text-qahwa-muted">
        Chargement...
      </div>
    );
  }

  const currentMonth = new Date().toISOString().slice(0, 7);

  const advancesThisMonth = advances
    .filter((a) => a.advance_date.startsWith(currentMonth))
    .reduce((sum, a) => sum + Number(a.amount), 0);

  const netSalary =
    (employee.salary || 0) - advancesThisMonth;

  const eventsByDay: Record<string, ClockEvent[]> = {};

  for (const ev of clockEvents) {
    const day = ev.created_at.slice(0, 10);

    if (!eventsByDay[day]) {
      eventsByDay[day] = [];
    }

    eventsByDay[day].push(ev);
  }

  const days = Object.keys(eventsByDay).sort((a, b) =>
    a < b ? 1 : -1
  );

  return (
    <div className="space-y-6 p-4 text-qahwa-text sm:p-6">
      <style>{`
        @keyframes qahwa-pulse-green {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(34,197,94,0.5);
          }
          50% {
            opacity: 0.7;
            box-shadow: 0 0 0 4px rgba(34,197,94,0);
          }
        }

        @keyframes qahwa-pulse-red {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(239,68,68,0.6);
          }
          50% {
            opacity: 0.7;
            box-shadow: 0 0 0 5px rgba(239,68,68,0);
          }
        }

        @keyframes qahwa-pulse-blue {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(96,165,250,0.5);
          }
          50% {
            opacity: 0.7;
            box-shadow: 0 0 0 4px rgba(96,165,250,0);
          }
        }

        .qahwa-pulse-dot {
          animation: qahwa-pulse-green 1.8s ease-in-out infinite;
        }

        .qahwa-pulse-red {
          animation: qahwa-pulse-red 1.2s ease-in-out infinite;
        }

        .qahwa-pulse-blue {
          animation: qahwa-pulse-blue 1.8s ease-in-out infinite;
        }
      `}</style>

      {/* HEADER */}
      <div className="rounded-2xl border border-white/10 bg-qahwa-panel shadow-panel">
        <div className="p-5 sm:p-6">
          <Link
            href="/qahwa/employes"
            className="text-[11px] font-display uppercase tracking-wide text-qahwa-muted transition hover:text-qahwa-orange"
          >
            ← Retour à l'équipe
          </Link>

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {employee.photo_url ? (
                <button
                  type="button"
                  onClick={() => setZoomedPhoto(employee.photo_url)}
                  className="shrink-0"
                >
                  <img
                    src={employee.photo_url}
                    alt={employee.name}
                    className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/10 transition hover:opacity-80"
                  />
                </button>
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] font-display text-xl uppercase text-qahwa-muted">
                  {employee.name.charAt(0)}
                </div>
              )}

              <div className="min-w-0">
                <h1 className="truncate font-display text-2xl uppercase tracking-wide text-qahwa-text">
                  {employee.name}
                </h1>

                <p className="mt-1 text-[11px] uppercase tracking-[0.15em] text-qahwa-muted">
                  {employee.position || "Employé"}
                </p>

                <p className="mt-2 text-[10px] text-qahwa-muted">
                  Code personnel :{" "}
                  <span className="text-qahwa-text">
                    {employee.code}
                  </span>
                </p>
              </div>
            </div>

            <span
              className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-[10px] font-display uppercase tracking-wide ${
                employee.active
                  ? "border-qahwa-green/20 bg-qahwa-green/10 text-qahwa-green"
                  : "border-qahwa-rouge/20 bg-qahwa-rouge/10 text-qahwa-rouge"
              }`}
            >
              {employee.active ? "Actif" : "Inactif"}
            </span>
          </div>
        </div>
      </div>

      {/* SALAIRE */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-qahwa-panel p-5 shadow-panel">
          <p className="text-[10px] uppercase tracking-wider text-qahwa-muted">
            Salaire de base
          </p>

          <p className="mt-3 font-display text-xl text-qahwa-text">
            {employee.salary?.toLocaleString() ?? 0} DA
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-qahwa-panel p-5 shadow-panel">
          <p className="text-[10px] uppercase tracking-wider text-qahwa-muted">
            Acomptes ce mois
          </p>

          <p className="mt-3 font-display text-xl text-qahwa-rouge">
            -{advancesThisMonth.toLocaleString()} DA
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-qahwa-panel p-5 shadow-panel">
          <p className="text-[10px] uppercase tracking-wider text-qahwa-muted">
            Salaire net
          </p>

          <p className="mt-3 font-display text-xl text-qahwa-orange">
            {netSalary.toLocaleString()} DA
          </p>
        </div>
      </div>

      {/* CONTENU */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* POINTAGE */}
        <div className="rounded-2xl border border-white/10 bg-qahwa-panel p-5 shadow-panel">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm uppercase tracking-wide text-qahwa-text">
                Historique de pointage
              </h2>

              <p className="mt-1 text-[10px] text-qahwa-muted">
                Derniers mouvements
              </p>
            </div>

            <span className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[9px] font-display uppercase text-qahwa-muted">
              {clockEvents.length} entrées
            </span>
          </div>

          {days.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-8 text-center">
              <p className="text-xs text-qahwa-muted">
                Aucun pointage enregistré.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {days.map((day) => (
                <div key={day}>
                  <p className="mb-2 text-[10px] uppercase tracking-wider text-qahwa-muted">
                    {formatDay(day)}
                  </p>

                  <div className="space-y-2">
                    {(eventsByDay[day] ?? []).map((ev) => {
                      const status = eventStatus(ev);

                      let dotClass = "bg-qahwa-muted";
                      let pulseClass = "";

                      if (ev.event_type === "in") {
                        if (status === "late") {
                          dotClass = "bg-qahwa-rouge";
                          pulseClass = "qahwa-pulse-red";
                        } else {
                          dotClass = "bg-blue-400";
                          pulseClass = "qahwa-pulse-blue";
                        }
                      }

                      return (
                        <div
                          key={ev.id}
                          className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#161616] p-3 transition hover:border-white/20"
                        >
                          {ev.photo_url ? (
                            <button
                              type="button"
                              onClick={() =>
                                setZoomedPhoto(ev.photo_url)
                              }
                              className="shrink-0"
                            >
                              <img
                                src={ev.photo_url}
                                alt=""
                                className="h-11 w-11 rounded-xl object-cover transition hover:opacity-75"
                              />
                            </button>
                          ) : (
                            <div className="h-11 w-11 shrink-0 rounded-xl border border-white/10 bg-white/[0.03]" />
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-2 font-display text-xs uppercase text-qahwa-text">
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full ${dotClass} ${pulseClass}`}
                              />

                              {ev.event_type === "in"
                                ? "Arrivée"
                                : "Départ"}

                              {status === "late" && (
                                <span className="rounded-full border border-qahwa-rouge/20 bg-qahwa-rouge/10 px-1.5 py-0.5 text-[8px] normal-case text-qahwa-rouge">
                                  Retard
                                </span>
                              )}
                            </p>

                            <p className="mt-1 text-[11px] text-qahwa-muted">
                              {formatTime(ev.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ACOMPTES */}
        <div className="rounded-2xl border border-white/10 bg-qahwa-panel p-5 shadow-panel">
          <div className="mb-5">
            <h2 className="font-display text-sm uppercase tracking-wide text-qahwa-text">
              Acomptes
            </h2>

            <p className="mt-1 text-[10px] text-qahwa-muted">
              Gestion des avances sur salaire
            </p>
          </div>

          <form
            onSubmit={handleAddAdvance}
            className="mb-4 rounded-xl border border-white/10 bg-[#161616] p-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[9px] font-display uppercase tracking-wider text-qahwa-muted">
                  Montant
                </label>

                <input
                  type="number"
                  placeholder="Montant"
                  value={amount || ""}
                  onChange={(e) =>
                    setAmount(Number(e.target.value))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[9px] font-display uppercase tracking-wider text-qahwa-muted">
                  Date
                </label>

                <input
                  type="date"
                  value={advanceDate}
                  onChange={(e) =>
                    setAdvanceDate(e.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[9px] font-display uppercase tracking-wider text-qahwa-muted">
                  Note
                </label>

                <input
                  type="text"
                  placeholder="Note (optionnel)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-xs font-display uppercase text-qahwa-text transition hover:border-qahwa-orange/40 hover:text-qahwa-orange disabled:opacity-50 sm:col-span-2"
              >
                {saving ? "Ajout..." : "+ Ajouter l'acompte"}
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {advances.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-8 text-center">
                <p className="text-xs text-qahwa-muted">
                  Aucun acompte enregistré.
                </p>
              </div>
            ) : (
              advances.map((a) => (
                <div
                  key={a.id}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#161616] p-3 transition hover:border-white/20"
                >
                  <div className="min-w-0">
                    <p className="font-display text-sm text-qahwa-text">
                      {Number(a.amount).toLocaleString()} DA
                    </p>

                    <p className="mt-1 truncate text-[10px] text-qahwa-muted">
                      {a.advance_date}
                      {a.note ? ` — ${a.note}` : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteAdvance(a.id)}
                    className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-display uppercase text-qahwa-muted opacity-0 transition hover:border-qahwa-rouge/30 hover:text-qahwa-rouge group-hover:opacity-100"
                  >
                    Suppr.
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* PHOTO ZOOM */}
      {zoomedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setZoomedPhoto(null)}
        >
          <img
            src={zoomedPhoto}
            alt=""
            className="max-h-[85vh] max-w-full rounded-2xl border border-white/10 shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}

