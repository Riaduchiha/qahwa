"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createEmployee, updateEmployee, deleteEmployee } from "./actions";

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
  employee_id: string;
  event_type: "in" | "out";
  created_at: string;
}

interface Schedule {
  employee_id: string;
  day_of_week: number;
  start_time: string;
}

const inputClass =
  "w-full rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-2 text-sm text-qahwa-text placeholder:text-qahwa-muted focus:outline-none focus:ring-2 focus:ring-qahwa-orange";

const BANNER_COLORS = [
  "bg-qahwa-orange",
  "bg-qahwa-green",
  "bg-blue-400",
  "bg-pink-400",
  "bg-purple-400",
];

const AVATAR_COLORS = [
  "bg-qahwa-orange/20 text-qahwa-orange",
  "bg-qahwa-green/20 text-qahwa-green",
  "bg-blue-400/20 text-blue-300",
  "bg-pink-400/20 text-pink-300",
  "bg-purple-400/20 text-purple-300",
];

const GRACE_MINUTES = 10;

function colorIndex(name: string) {
  return name.charCodeAt(0) % BANNER_COLORS.length;
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

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [lastEvents, setLastEvents] = useState<Record<string, ClockEvent>>({});
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [form, setForm] = useState({
    name: "",
    position: "",
    phone: "",
    salary: 0,
    code: "",
    photo_url: null as string | null,
    active: true,
  });

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const loadData = useCallback(async () => {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .order("name");
    if (data) setEmployees(data as Employee[]);

    const { data: events } = await supabase
      .from("employee_clock_events")
      .select("employee_id, event_type, created_at")
      .order("created_at", { ascending: false });

    if (events) {
      const map: Record<string, ClockEvent> = {};
      for (const ev of events as ClockEvent[]) {
        if (!map[ev.employee_id]) {
          map[ev.employee_id] = ev;
        }
      }
      setLastEvents(map);
    }

    const { data: schedData } = await supabase
      .from("employee_schedules")
      .select("employee_id, day_of_week, start_time");
    if (schedData) setSchedules(schedData as Schedule[]);
  }, [supabase]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("employees-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employees" },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employee_clock_events" },
        () => loadData()
      )
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

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fileName = `avatar-${Date.now()}.jpg`;
    const { data } = await supabase.storage
      .from("employee-photos")
      .upload(fileName, file);
    if (data) {
      const { data: urlData } = supabase.storage
        .from("employee-photos")
        .getPublicUrl(data.path);
      setForm((f) => ({ ...f, photo_url: urlData.publicUrl }));
    }
    setUploading(false);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = editingEmp
      ? await updateEmployee(editingEmp.id, form)
      : await createEmployee(form);

    if (res && !res.success) {
      alert("Erreur : " + res.error);
      setLoading(false);
      return;
    }

    setIsModalOpen(false);
    setEditingEmp(null);
    setForm({ name: "", position: "", phone: "", salary: 0, code: "", photo_url: null, active: true });
    await loadData();
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Supprimer cet employe ?")) {
      try {
        await deleteEmployee(id);
        await loadData();
      } catch (err: any) {
        alert("Erreur : " + err.message);
      }
    }
  };

  function lateStatus(emp: Employee, ev: ClockEvent | undefined) {
    if (!ev || ev.event_type !== "in") return null;
    const day = dayOfWeekFromDate(ev.created_at);
    const sched = schedules.find(
      (s) => s.employee_id === emp.id && s.day_of_week === day
    );
    if (!sched) return "unknown";
    return isLate(ev.created_at, sched.start_time) ? "late" : "ontime";
  }

  const activeCount = employees.filter((e) => e.active).length;

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl uppercase text-qahwa-text">
            Equipe
          </h1>
          <p className="text-xs text-qahwa-muted">
            {activeCount} employe{activeCount > 1 ? "s" : ""} actif{activeCount > 1 ? "s" : ""} sur {employees.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/qahwa/employes/planning"
            className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-4 py-2 font-display text-xs uppercase text-qahwa-text shadow-panel hover:border-qahwa-orange hover:text-qahwa-orange transition"
          >
            Planning
          </Link>
          <Link
            href="/qahwa/pointage"
            className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-4 py-2 font-display text-xs uppercase text-qahwa-text shadow-panel hover:border-qahwa-orange hover:text-qahwa-orange transition"
          >
            Pointage
          </Link>
          <button
            onClick={() => {
              setEditingEmp(null);
              setForm({ name: "", position: "", phone: "", salary: 0, code: "", photo_url: null, active: true });
              setIsModalOpen(true);
            }}
            className="rounded-lg border border-qahwa-orange bg-qahwa-orange px-4 py-2 font-display text-xs uppercase text-qahwa-noir shadow-panel hover:bg-qahwa-orange/90"
          >
            + Ajouter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {employees.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-qahwa-border bg-qahwa-panel p-10 text-center text-qahwa-muted">
            Aucun employe pour le moment. Clique sur &quot;+ Ajouter&quot; pour commencer.
          </div>
        ) : (
          employees.map((emp) => {
            const idx = colorIndex(emp.name);
            const lastEvent = lastEvents[emp.id];
            const isPresent = lastEvent?.event_type === "in";
            const status = lateStatus(emp, lastEvent);

            let statusDotClass = "bg-qahwa-muted";
            let statusLabel = "Aucun pointage";
            let statusPulse = "";
            if (lastEvent) {
              if (isPresent) {
                if (status === "late") {
                  statusDotClass = "bg-qahwa-rouge";
                  statusPulse = "qahwa-pulse-red";
                  statusLabel = `Present depuis ${formatTime(lastEvent.created_at)} (retard)`;
                } else {
                  statusDotClass = "bg-blue-400";
                  statusPulse = "qahwa-pulse-blue";
                  statusLabel = `Present depuis ${formatTime(lastEvent.created_at)}`;
                }
              } else {
                statusDotClass = "bg-qahwa-muted";
                statusLabel = `Parti a ${formatTime(lastEvent.created_at)}`;
              }
            }

            return (
              <div
                key={emp.id}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-panel backdrop-blur-xl transition hover:border-qahwa-orange/50"
              >
                <div className={`h-1.5 ${BANNER_COLORS[idx]}`} />
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    {emp.photo_url ? (
                      <img
                        src={emp.photo_url}
                        alt={emp.name}
                        className="h-11 w-11 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-base uppercase ${AVATAR_COLORS[idx]}`}
                      >
                        {emp.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/qahwa/employes/${emp.id}`}
                        className="truncate font-display text-base text-qahwa-text hover:text-qahwa-orange"
                      >
                        {emp.name}
                      </Link>
                      <p className="truncate text-xs uppercase tracking-wide text-qahwa-muted">
                        {emp.position || "Employe"}
                      </p>
                    </div>
                    {emp.active ? (
                      <span
                        className="qahwa-pulse-dot h-2.5 w-2.5 shrink-0 rounded-full bg-qahwa-green"
                        title="Actif"
                      />
                    ) : (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full bg-qahwa-rouge"
                        title="Inactif"
                      />
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs backdrop-blur-md">
                    <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass} ${statusPulse}`} />
                    <span className="text-qahwa-muted">{statusLabel}</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm backdrop-blur-md">
                    <span className="text-qahwa-muted">{emp.phone || "Pas de tel"}</span>
                    <span className="font-display text-qahwa-orange">
                      {emp.salary ? emp.salary.toLocaleString() : 0} DA
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <Link
                      href={`/qahwa/employes/${emp.id}`}
                      className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-qahwa-muted hover:border-qahwa-orange hover:text-qahwa-orange"
                    >
                      Voir la fiche
                    </Link>
                    <div className="flex gap-2 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => {
                          setEditingEmp(emp);
                          setForm({
                            name: emp.name,
                            position: emp.position,
                            phone: emp.phone,
                            salary: emp.salary || 0,
                            code: emp.code || "",
                            photo_url: emp.photo_url,
                            active: emp.active,
                          });
                          setIsModalOpen(true);
                        }}
                        className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-qahwa-muted hover:text-qahwa-text"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(emp.id)}
                        className="rounded border border-qahwa-rouge/40 bg-qahwa-rouge/10 px-2 py-1 text-xs text-qahwa-rouge"
                      >
                        Suppr.
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-qahwa-border bg-qahwa-panel p-6 shadow-2xl space-y-4">
            <h3 className="font-display text-lg uppercase text-qahwa-text">
              {editingEmp ? "Modifier l'employe" : "Nouvel employe"}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-display uppercase text-qahwa-muted mb-1">
                  Nom
                </label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Ines"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-display uppercase text-qahwa-muted mb-1">
                  Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className={inputClass}
                />
                {uploading && (
                  <p className="mt-1 text-xs text-qahwa-muted">Envoi en cours...</p>
                )}
                {form.photo_url && (
                  <img
                    src={form.photo_url}
                    alt=""
                    className="mt-2 h-16 w-16 rounded-full object-cover"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-display uppercase text-qahwa-muted mb-1">
                  Poste
                </label>
                <input
                  type="text"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  placeholder="Ex: Barista"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-display uppercase text-qahwa-muted mb-1">
                  Telephone
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Ex: 0555 00 00 00"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-display uppercase text-qahwa-muted mb-1">
                  Code personnel (pour le pointage)
                </label>
                <input
                  required
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="Ex: 1234"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-display uppercase text-qahwa-muted mb-1">
                  Salaire mensuel (DA)
                </label>
                <input
                  type="number"
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })}
                  placeholder="Ex: 35000"
                  className={inputClass}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                <label htmlFor="active" className="text-sm text-qahwa-text">
                  Employe actif
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-4 py-2 text-xs font-display uppercase text-qahwa-muted"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg border border-qahwa-orange bg-qahwa-orange px-4 py-2 text-xs font-display uppercase text-qahwa-noir disabled:opacity-50"
                >
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}