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
  "w-full rounded-xl border border-qahwa-border bg-qahwa-panel2 px-3 py-2.5 text-sm text-qahwa-text placeholder:text-qahwa-muted focus:outline-none focus:ring-2 focus:ring-qahwa-orange";

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

      setForm((f) => ({
        ...f,
        photo_url: urlData.publicUrl,
      }));
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

    setForm({
      name: "",
      position: "",
      phone: "",
      salary: 0,
      code: "",
      photo_url: null,
      active: true,
    });

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-qahwa-orange" />

            <div>
              <h1 className="font-display text-2xl uppercase tracking-wide text-qahwa-text">
                Equipe
              </h1>

              <p className="mt-1 text-xs text-qahwa-muted">
                {activeCount} employé{activeCount > 1 ? "s" : ""} actif
                {activeCount > 1 ? "s" : ""} sur {employees.length}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/qahwa/employes/planning"
            className="rounded-xl border border-qahwa-border bg-qahwa-panel px-4 py-2.5 text-xs font-display uppercase text-qahwa-text shadow-panel transition hover:border-qahwa-orange hover:text-qahwa-orange"
          >
            Planning
          </Link>

          <Link
            href="/qahwa/pointage"
            className="rounded-xl border border-qahwa-border bg-qahwa-panel px-4 py-2.5 text-xs font-display uppercase text-qahwa-text shadow-panel transition hover:border-qahwa-orange hover:text-qahwa-orange"
          >
            Pointage
          </Link>

          <button
            onClick={() => {
              setEditingEmp(null);

              setForm({
                name: "",
                position: "",
                phone: "",
                salary: 0,
                code: "",
                photo_url: null,
                active: true,
              });

              setIsModalOpen(true);
            }}
            className="rounded-xl border border-qahwa-orange bg-qahwa-orange px-4 py-2.5 text-xs font-display uppercase text-qahwa-noir shadow-panel transition hover:bg-qahwa-orange/90"
          >
            + Ajouter
          </button>
        </div>
      </div>

      {/* EMPLOYEES */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {employees.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-qahwa-border bg-qahwa-panel p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-qahwa-border bg-qahwa-panel2 text-xl text-qahwa-muted">
              +
            </div>

            <p className="text-sm text-qahwa-muted">
              Aucun employé pour le moment.
            </p>

            <p className="mt-1 text-xs text-qahwa-muted/70">
              Clique sur « + Ajouter » pour commencer.
            </p>
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
                  statusLabel = `Présent depuis ${formatTime(
                    lastEvent.created_at
                  )} · retard`;
                } else {
                  statusDotClass = "bg-blue-400";
                  statusPulse = "qahwa-pulse-blue";
                  statusLabel = `Présent depuis ${formatTime(
                    lastEvent.created_at
                  )}`;
                }
              } else {
                statusDotClass = "bg-qahwa-muted";
                statusLabel = `Parti à ${formatTime(lastEvent.created_at)}`;
              }
            }

            return (
              <div
                key={emp.id}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-qahwa-panel shadow-panel transition duration-300 hover:-translate-y-1 hover:border-qahwa-orange/40 hover:shadow-2xl"
              >
                {/* TOP COLOR */}
                <div className={`h-1.5 ${BANNER_COLORS[idx]}`} />

                <div className="p-5">
                  {/* PROFILE */}
                  <div className="flex items-start gap-4">
                    {emp.photo_url ? (
                      <div className="relative shrink-0">
                        <img
                          src={emp.photo_url}
                          alt={emp.name}
                          className="h-14 w-14 rounded-2xl object-cover ring-1 ring-white/10"
                        />

                        <span
                          className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-qahwa-panel ${
                            emp.active
                              ? "qahwa-pulse-dot bg-qahwa-green"
                              : "bg-qahwa-rouge"
                          }`}
                        />
                      </div>
                    ) : (
                      <div className="relative shrink-0">
                        <div
                          className={`flex h-14 w-14 items-center justify-center rounded-2xl font-display text-lg uppercase ring-1 ring-white/10 ${AVATAR_COLORS[idx]}`}
                        >
                          {emp.name.charAt(0)}
                        </div>

                        <span
                          className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-qahwa-panel ${
                            emp.active
                              ? "qahwa-pulse-dot bg-qahwa-green"
                              : "bg-qahwa-rouge"
                          }`}
                        />
                      </div>
                    )}

                    <div className="min-w-0 flex-1 pt-0.5">
                      <Link
                        href={`/qahwa/employes/${emp.id}`}
                        className="block truncate font-display text-base uppercase tracking-wide text-qahwa-text transition hover:text-qahwa-orange"
                      >
                        {emp.name}
                      </Link>

                      <p className="mt-1 truncate text-[11px] uppercase tracking-[0.16em] text-qahwa-muted">
                        {emp.position || "Employé"}
                      </p>

                      <span
                        className={`mt-2 inline-flex items-center rounded-full px-2 py-1 text-[10px] font-display uppercase tracking-wide ${
                          emp.active
                            ? "bg-qahwa-green/10 text-qahwa-green"
                            : "bg-qahwa-rouge/10 text-qahwa-rouge"
                        }`}
                      >
                        {emp.active ? "Actif" : "Inactif"}
                      </span>
                    </div>
                  </div>

                  {/* POINTAGE */}
                  <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass} ${statusPulse}`}
                      />

                      <span className="truncate text-xs text-qahwa-muted">
                        {statusLabel}
                      </span>
                    </div>
                  </div>

                  {/* INFOS */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[9px] uppercase tracking-wider text-qahwa-muted">
                        Téléphone
                      </p>

                      <p className="mt-1 truncate text-xs text-qahwa-text">
                        {emp.phone || "Non renseigné"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[9px] uppercase tracking-wider text-qahwa-muted">
                        Salaire
                      </p>

                      <p className="mt-1 truncate font-display text-xs text-qahwa-orange">
                        {emp.salary ? emp.salary.toLocaleString() : 0} DA
                      </p>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                    <Link
                      href={`/qahwa/employes/${emp.id}`}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-display uppercase text-qahwa-muted transition hover:border-qahwa-orange hover:text-qahwa-orange"
                    >
                      Voir la fiche
                    </Link>

                    <div className="flex gap-2">
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
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-display uppercase text-qahwa-muted transition hover:border-white/20 hover:text-qahwa-text"
                      >
                        Modifier
                      </button>

                      <button
                        onClick={() => handleDelete(emp.id)}
                        className="rounded-lg border border-qahwa-rouge/20 bg-qahwa-rouge/5 px-3 py-2 text-[11px] font-display uppercase text-qahwa-rouge transition hover:bg-qahwa-rouge/10"
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

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-qahwa-border bg-qahwa-panel p-6 shadow-2xl">
            <div className="mb-5">
              <div className="mb-3 h-1 w-10 rounded-full bg-qahwa-orange" />

              <h3 className="font-display text-lg uppercase tracking-wide text-qahwa-text">
                {editingEmp ? "Modifier l'employé" : "Nouvel employé"}
              </h3>

              <p className="mt-1 text-xs text-qahwa-muted">
                Informations du personnel QAHWA
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-display uppercase tracking-wider text-qahwa-muted">
                  Nom
                </label>

                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Ex: Ines"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-display uppercase tracking-wider text-qahwa-muted">
                  Photo
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className={inputClass}
                />

                {uploading && (
                  <p className="mt-1 text-xs text-qahwa-muted">
                    Envoi en cours...
                  </p>
                )}

                {form.photo_url && (
                  <img
                    src={form.photo_url}
                    alt=""
                    className="mt-3 h-16 w-16 rounded-2xl object-cover ring-1 ring-white/10"
                  />
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-display uppercase tracking-wider text-qahwa-muted">
                  Poste
                </label>

                <input
                  type="text"
                  value={form.position}
                  onChange={(e) =>
                    setForm({ ...form, position: e.target.value })
                  }
                  placeholder="Ex: Barista"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-display uppercase tracking-wider text-qahwa-muted">
                  Téléphone
                </label>

                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                  placeholder="Ex: 0555 00 00 00"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-display uppercase tracking-wider text-qahwa-muted">
                  Code personnel
                </label>

                <input
                  required
                  type="text"
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value })
                  }
                  placeholder="Ex: 1234"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-display uppercase tracking-wider text-qahwa-muted">
                  Salaire mensuel (DA)
                </label>

                <input
                  type="number"
                  value={form.salary}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      salary: Number(e.target.value),
                    })
                  }
                  placeholder="Ex: 35000"
                  className={inputClass}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      active: e.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-orange-500"
                />

                <span>
                  <span className="block text-xs font-display uppercase text-qahwa-text">
                    Employé actif
                  </span>

                  <span className="block text-[10px] text-qahwa-muted">
                    Autorisé à utiliser le poste
                  </span>
                </span>
              </label>

              <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-qahwa-border bg-qahwa-panel2 px-4 py-2.5 text-xs font-display uppercase text-qahwa-muted transition hover:text-qahwa-text"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl border border-qahwa-orange bg-qahwa-orange px-4 py-2.5 text-xs font-display uppercase text-qahwa-noir transition hover:bg-qahwa-orange/90 disabled:opacity-50"
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