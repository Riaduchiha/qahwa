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
  "w-full rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-2 text-sm text-qahwa-text placeholder:text-qahwa-muted focus:outline-none focus:ring-2 focus:ring-qahwa-orange";

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
        { event: "*", schema: "public", table: "employee_clock_events" },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employee_advances" },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employee_schedules" },
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
    const res = await addAdvance(employeeId, amount, note, advanceDate);
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
    const sched = schedules.find((s) => s.day_of_week === day);
    if (!sched) return "unknown";
    return isLate(ev.created_at, sched.start_time) ? "late" : "ontime";
  }

  if (!employee) {
    return <div className="p-6 text-qahwa-muted">Chargement...</div>;
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const advancesThisMonth = advances
    .filter((a) => a.advance_date.startsWith(currentMonth))
    .reduce((sum, a) => sum + Number(a.amount), 0);
  const netSalary = (employee.salary || 0) - advancesThisMonth;

  const eventsByDay: Record<string, ClockEvent[]> = {};
  for (const ev of clockEvents) {
    const day = ev.created_at.slice(0, 10);
    if (!eventsByDay[day]) eventsByDay[day] = [];
    eventsByDay[day].push(ev);
  }
  const days = Object.keys(eventsByDay).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="space-y-6 p-6 text-qahwa-text">
      <style>{`
        @keyframes qahwa-pulse-green {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(34,197,94,0); }
        }
        @keyframes qahwa-pulse-red {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239,68,68,0.6); }
          50% { opacity: 0.7; box-shadow: 0 0 0 5px rgba(239,68,68,0); }
        }
        @keyframes qahwa-pulse-blue {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(96,165,250,0.5); }
          50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(96,165,250,0); }
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

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/qahwa/employes"
            className="text-xs text-qahwa-muted hover:text-qahwa-orange"
          >
            &larr; Retour a l&apos;equipe
          </Link>
          <div className="mt-2 flex items-center gap-3">
            {employee.photo_url ? (
              <img
                src={employee.photo_url}
                alt={employee.name}
                className="h-14 w-14 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-qahwa-orange/20 font-display text-xl uppercase text-qahwa-orange">
                {employee.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-display text-2xl uppercase text-qahwa-text">
                {employee.name}
              </h1>
              <p className="text-xs uppercase text-qahwa-muted">
                {employee.position} — Code {employee.code}
              </p>
            </div>
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-display uppercase ${
            employee.active
              ? "border border-qahwa-green/40 bg-qahwa-green/15 text-qahwa-green"
              : "border border-qahwa-rouge/40 bg-qahwa-rouge/15 text-qahwa-rouge"
          }`}
        >
          {employee.active ? "Actif" : "Inactif"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-qahwa-border bg-qahwa-panel p-4 shadow-panel">
          <p className="text-xs uppercase text-qahwa-muted">Salaire de base</p>
          <p className="mt-2 font-display text-xl text-qahwa-text">
            {employee.salary?.toLocaleString() ?? 0} DA
          </p>
        </div>
        <div className="rounded-xl border border-qahwa-border bg-qahwa-panel p-4 shadow-panel">
          <p className="text-xs uppercase text-qahwa-muted">Acomptes ce mois</p>
          <p className="mt-2 font-display text-xl text-qahwa-rouge">
            -{advancesThisMonth.toLocaleString()} DA
          </p>
        </div>
        <div className="rounded-xl border border-qahwa-orange/40 bg-qahwa-orange/10 p-4 shadow-panel">
          <p className="text-xs uppercase text-qahwa-muted">Salaire net (ce mois)</p>
          <p className="mt-2 font-display text-xl text-qahwa-orange">
            {netSalary.toLocaleString()} DA
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-display text-sm uppercase text-qahwa-muted">
            Historique de pointage
          </h2>
          {days.length === 0 ? (
            <p className="text-sm text-qahwa-muted">Aucun pointage enregistre.</p>
          ) : (
            <div className="space-y-4">
              {days.map((day) => (
                <div key={day}>
                  <p className="mb-2 text-[11px] uppercase tracking-wide text-qahwa-muted">
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
                          className="flex items-center gap-3 rounded-xl border border-qahwa-border bg-qahwa-panel p-3 shadow-panel"
                        >
                          {ev.photo_url ? (
                            <button
                              type="button"
                              onClick={() => setZoomedPhoto(ev.photo_url)}
                              className="shrink-0"
                            >
                              <img
                                src={ev.photo_url}
                                alt=""
                                className="h-12 w-12 rounded-lg object-cover transition hover:opacity-80"
                              />
                            </button>
                          ) : (
                            <div className="h-12 w-12 shrink-0 rounded-lg bg-qahwa-panel2" />
                          )}
                          <div className="flex-1">
                            <p className="flex items-center gap-2 font-display text-sm uppercase text-qahwa-text">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${dotClass} ${pulseClass}`}
                              />
                              {ev.event_type === "in" ? "Arrivee" : "Depart"}
                              {status === "late" && (
                                <span className="rounded-full border border-qahwa-rouge/40 bg-qahwa-rouge/10 px-1.5 py-0.5 text-[9px] normal-case text-qahwa-rouge">
                                  Retard
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-qahwa-muted">
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

        <div>
          <h2 className="mb-3 font-display text-sm uppercase text-qahwa-muted">
            Acomptes
          </h2>
          <form
            onSubmit={handleAddAdvance}
            className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-qahwa-border bg-qahwa-panel p-3 shadow-panel sm:grid-cols-4"
          >
            <input
              type="number"
              placeholder="Montant"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              className={inputClass}
            />
            <input
              type="date"
              value={advanceDate}
              onChange={(e) => setAdvanceDate(e.target.value)}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Note (optionnel)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`${inputClass} sm:col-span-1`}
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg border border-qahwa-orange bg-qahwa-orange px-3 py-2 text-xs font-display uppercase text-qahwa-noir disabled:opacity-50"
            >
              Ajouter
            </button>
          </form>

          <div className="space-y-2">
            {advances.length === 0 ? (
              <p className="text-sm text-qahwa-muted">Aucun acompte enregistre.</p>
            ) : (
              advances.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-xl border border-qahwa-border bg-qahwa-panel p-3 text-sm shadow-panel"
                >
                  <div>
                    <p className="font-display text-qahwa-text">
                      {Number(a.amount).toLocaleString()} DA
                    </p>
                    <p className="text-xs text-qahwa-muted">
                      {a.advance_date} {a.note ? `— ${a.note}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteAdvance(a.id)}
                    className="rounded border border-qahwa-rouge/40 bg-qahwa-rouge/10 px-2 py-1 text-xs text-qahwa-rouge"
                  >
                    Suppr.
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {zoomedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomedPhoto(null)}
        >
          <img
            src={zoomedPhoto}
            alt=""
            className="max-h-[85vh] max-w-full rounded-xl border border-qahwa-border shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}