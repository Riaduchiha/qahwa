
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { addSchedule, deleteSchedule } from "../actions";

interface Employee {
  id: string;
  name: string;
}

interface Schedule {
  id: string;
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const DAYS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#161616] px-3 py-2.5 text-sm text-qahwa-text focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10";

export default function PlanningPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [saving, setSaving] = useState(false);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const loadData = useCallback(async () => {
    const { data: empData } = await supabase
      .from("employees")
      .select("id, name")
      .eq("active", true)
      .order("name");

    if (empData) {
      const typedEmpData = empData as Employee[];
      setEmployees(typedEmpData);
      setSelectedEmployeeId((prev) => prev || typedEmpData[0]?.id || "");
    }

    const { data: schedData } = await supabase
      .from("employee_schedules")
      .select("*")
      .order("day_of_week");

    if (schedData) setSchedules(schedData as Schedule[]);
  }, [supabase]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("schedules-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "employee_schedules",
        },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedEmployeeId) return;

    setSaving(true);

    const res = await addSchedule(
      selectedEmployeeId,
      dayOfWeek,
      startTime,
      endTime
    );

    if (res && !res.success) {
      alert("Erreur : " + res.error);
    }

    await loadData();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    try {
      await deleteSchedule(id);
      await loadData();
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  }

  function employeeName(id: string) {
    return employees.find((e) => e.id === id)?.name ?? "Inconnu";
  }

  return (
    <div className="space-y-6 p-4 text-qahwa-text sm:p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-wide text-qahwa-text">
            Planning
          </h1>

          <p className="mt-1 text-xs text-qahwa-muted">
            Horaires hebdomadaires de l'équipe
          </p>
        </div>

        <div className="hidden h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-qahwa-panel sm:flex">
          <span className="text-sm text-qahwa-muted">▦</span>
        </div>
      </div>

      {/* AJOUT HORAIRE */}
      <form
        onSubmit={handleAdd}
        className="rounded-2xl border border-white/10 bg-qahwa-panel shadow-panel"
      >
        <div className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm uppercase tracking-wide text-qahwa-text">
                Ajouter un horaire
              </h2>

              <p className="mt-1 text-[11px] text-qahwa-muted">
                Planifier un service
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[9px] font-display uppercase tracking-wider text-qahwa-muted">
              Planning
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <div>
              <label className="mb-1.5 block text-[10px] font-display uppercase tracking-wider text-qahwa-muted">
                Employé
              </label>

              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className={inputClass}
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-display uppercase tracking-wider text-qahwa-muted">
                Jour
              </label>

              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className={inputClass}
              >
                {DAYS.map((d, i) => (
                  <option key={i} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-display uppercase tracking-wider text-qahwa-muted">
                Début
              </label>

              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-display uppercase tracking-wider text-qahwa-muted">
                Fin
              </label>

              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-xs font-display uppercase text-qahwa-text transition hover:border-qahwa-orange/40 hover:bg-white/[0.09] hover:text-qahwa-orange disabled:opacity-50"
            >
              {saving ? "Ajout..." : "+ Ajouter"}
            </button>
          </div>
        </div>
      </form>

      {/* JOURS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {DAYS.map((day, i) => {
          const daySchedules = schedules.filter(
            (s) => s.day_of_week === i
          );

          return (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-qahwa-panel shadow-panel transition duration-300 hover:border-white/20 hover:shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <h2 className="font-display text-sm uppercase tracking-wide text-qahwa-text">
                    {day}
                  </h2>

                  <p className="mt-1 text-[10px] uppercase tracking-wider text-qahwa-muted">
                    {daySchedules.length} personne
                    {daySchedules.length > 1 ? "s" : ""}
                  </p>
                </div>

                <span className="text-[10px] font-display text-qahwa-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="p-4">
                {daySchedules.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-black/10 px-4 py-6 text-center">
                    <p className="text-xs text-qahwa-muted">
                      Personne prévu.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {daySchedules.map((s) => (
                      <li
                        key={s.id}
                        className="group rounded-xl border border-white/10 bg-[#161616] p-3 transition hover:border-white/20"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-display uppercase text-qahwa-text">
                              {employeeName(s.employee_id)}
                            </p>

                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-[11px] text-qahwa-muted">
                                {s.start_time.slice(0, 5)}
                              </span>

                              <span className="text-[10px] text-white/20">
                                —
                              </span>

                              <span className="text-[11px] text-qahwa-muted">
                                {s.end_time.slice(0, 5)}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDelete(s.id)}
                            className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-display uppercase text-qahwa-muted opacity-0 transition hover:border-qahwa-rouge/30 hover:text-qahwa-rouge group-hover:opacity-100"
                          >
                            Suppr.
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

