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

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const inputClass =
  "w-full rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-2 text-sm text-qahwa-text focus:outline-none focus:ring-2 focus:ring-qahwa-orange";

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
        { event: "*", schema: "public", table: "employee_schedules" },
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
    const res = await addSchedule(selectedEmployeeId, dayOfWeek, startTime, endTime);
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
    <div className="space-y-6 p-6 text-qahwa-text">
      <div>
        <h1 className="font-display text-2xl uppercase text-qahwa-text">
          Planning
        </h1>
        <p className="text-xs text-qahwa-muted">
          Horaires hebdomadaires par employe
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className="grid grid-cols-2 gap-3 rounded-xl border border-qahwa-border bg-qahwa-panel p-4 shadow-panel sm:grid-cols-5 sm:items-end"
      >
        <div>
          <label className="mb-1 block text-xs font-display uppercase text-qahwa-muted">
            Employe
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
          <label className="mb-1 block text-xs font-display uppercase text-qahwa-muted">
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
          <label className="mb-1 block text-xs font-display uppercase text-qahwa-muted">
            Debut
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-display uppercase text-qahwa-muted">
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
          className="rounded-lg border border-qahwa-orange bg-qahwa-orange px-4 py-2 font-display text-xs uppercase text-qahwa-noir shadow-panel disabled:opacity-50"
        >
          Ajouter
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DAYS.map((day, i) => {
          const daySchedules = schedules.filter((s) => s.day_of_week === i);
          return (
            <div
              key={i}
              className="rounded-xl border border-qahwa-border bg-qahwa-panel p-4 shadow-panel"
            >
              <p className="mb-2 font-display text-sm uppercase text-qahwa-muted">
                {day}
              </p>
              {daySchedules.length === 0 ? (
                <p className="text-xs text-qahwa-muted">Personne prevu.</p>
              ) : (
                <ul className="space-y-2">
                  {daySchedules.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-qahwa-border bg-qahwa-panel2 p-2 text-sm"
                    >
                      <span>
                        {employeeName(s.employee_id)} — {s.start_time.slice(0, 5)} a {s.end_time.slice(0, 5)}
                      </span>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="rounded border border-qahwa-rouge/40 bg-qahwa-rouge/10 px-2 py-1 text-xs text-qahwa-rouge"
                      >
                        Suppr.
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}