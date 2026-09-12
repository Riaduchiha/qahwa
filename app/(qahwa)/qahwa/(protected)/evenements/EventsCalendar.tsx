'use client'

import { useMemo, useState } from 'react'
import { createEvent, updateEvent, deleteEvent } from './actions'

type EventItem = {
  id: string
  title: string
  event_date: string
  type: string | null
  notes: string | null
  recurring: boolean
}

function getEventColor(type: string | null) {
  const t = (type ?? '').toLowerCase()
  if (t.includes('anniversaire')) return { dot: 'bg-pink-400', badge: 'bg-pink-400/20 text-pink-300', border: 'border-pink-400/50', bg: 'bg-pink-400/10' }
  if (t.includes('religi')) return { dot: 'bg-emerald-400', badge: 'bg-emerald-400/20 text-emerald-300', border: 'border-emerald-400/50', bg: 'bg-emerald-400/10' }
  if (t.includes('promo')) return { dot: 'bg-blue-400', badge: 'bg-blue-400/20 text-blue-300', border: 'border-blue-400/50', bg: 'bg-blue-400/10' }
  if (t.includes('off') || t.includes('fermeture') || t.includes('congé') || t.includes('conge')) return { dot: 'bg-red-500', badge: 'bg-red-500/20 text-red-400', border: 'border-red-500/50', bg: 'bg-red-500/10' }
  return { dot: 'bg-qahwa-orange', badge: 'bg-qahwa-orange/20 text-qahwa-orange', border: 'border-qahwa-orange/50', bg: 'bg-qahwa-orange/10' }
}

const inputClass =
  "w-full rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-2 text-sm text-qahwa-text placeholder:text-qahwa-muted focus:outline-none focus:ring-2 focus:ring-qahwa-orange"

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

function eventOccursOn(ev: EventItem, year: number, month: number, day: number) {
  const d = new Date(ev.event_date + 'T00:00:00')
  if (ev.recurring) return d.getMonth() === month && d.getDate() === day
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
}

export default function EventsCalendar({ initialEvents }: { initialEvents: EventItem[] }) {
  const [events, setEvents] = useState(initialEvents)
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null)
  const [form, setForm] = useState({ title: '', event_date: '', type: '', notes: '', recurring: false })

  function openAddModal(dateStr?: string) {
    setEditingEvent(null)
    setForm({ title: '', event_date: dateStr ?? '', type: '', notes: '', recurring: false })
    setIsModalOpen(true)
  }

  function openEditModal(ev: EventItem) {
    setEditingEvent(ev)
    setForm({ title: ev.title, event_date: ev.event_date, type: ev.type ?? '', notes: ev.notes ?? '', recurring: ev.recurring })
    setIsModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (editingEvent) {
      await updateEvent(editingEvent.id, form)
      setEvents((prev) => prev.map((ev) => (ev.id === editingEvent.id ? { ...ev, ...form } : ev)))
    } else {
      await createEvent(form)
      location.reload()
    }
    setIsModalOpen(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet événement ?')) return
    await deleteEvent(id)
    setEvents((prev) => prev.filter((ev) => ev.id !== id))
  }

  const grid = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1)
    const startWeekday = (firstOfMonth.getDay() + 6) % 7
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

    const cells: (number | null)[] = []
    for (let i = 0; i < startWeekday; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [viewYear, viewMonth])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  const upcoming = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return events
      .map((ev) => {
        const d = new Date(ev.event_date + 'T00:00:00')
        if (ev.recurring) {
          d.setFullYear(now.getFullYear())
          if (d < now) d.setFullYear(now.getFullYear() + 1)
        }
        return { ev, date: d }
      })
      .filter(({ date }) => date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5)
  }, [events])

  return (
    <div className="space-y-6 p-6 text-qahwa-text">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl uppercase text-qahwa-text">Calendrier des événements</h2>
          <p className="mt-1 text-sm text-qahwa-muted">Anniversaires, fêtes religieuses, occasions spéciales</p>
        </div>
        <button
          onClick={() => openAddModal()}
          className="rounded-lg bg-qahwa-orange px-4 py-2 text-xs font-bold uppercase tracking-wide text-white"
        >
          + Ajouter un événement
        </button>
      </div>

      <div className="rounded-xl border border-qahwa-border bg-qahwa-panel p-5 shadow-panel">
        <div className="flex items-center justify-between mb-2">
          <button onClick={prevMonth} className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-1 text-sm">←</button>
          <h3 className="font-display text-lg uppercase">{MONTHS[viewMonth]} {viewYear}</h3>
          <button onClick={nextMonth} className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-1 text-sm">→</button>
        </div>

      <div className="flex flex-wrap gap-4 text-xs text-qahwa-muted mb-4">
  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-pink-400" /> Anniversaire</span>
  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Religieux</span>
  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400" /> Promo</span>
  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Journée off</span>
  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-qahwa-orange" /> Autre</span>
</div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-qahwa-muted mb-2">
          {DAYS.map((d) => <div key={d}>{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map((day, idx) => {
            if (day === null) return <div key={idx} className="h-20 rounded-lg" />
            const dayEvents = events.filter((ev) => eventOccursOn(ev, viewYear, viewMonth, day))
            const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const first = dayEvents[0]
            const cellColor = first ? getEventColor(first.type) : null
            return (
              <button
                key={idx}
                onClick={() => {
                  if (first) openEditModal(first)
                  else openAddModal(dateStr)
                }}
                className={`h-20 rounded-lg border p-1 text-left text-xs transition ${
                  isToday
                    ? 'border-qahwa-orange'
                    : cellColor
                    ? cellColor.border
                    : 'border-qahwa-border'
                } ${cellColor ? cellColor.bg : 'bg-qahwa-panel2'} hover:border-qahwa-orange`}
              >
                <div className="font-bold">{day}</div>
                {dayEvents.slice(0, 2).map((ev) => {
                  const color = getEventColor(ev.type)
                  return (
                    <div key={ev.id} className={`mt-1 flex items-center gap-1 truncate rounded px-1 text-[10px] ${color.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
                      {ev.title}
                    </div>
                  )
                })}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-qahwa-border bg-qahwa-panel p-5 shadow-panel">
        <h3 className="font-display text-lg uppercase mb-3">Prochains événements</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-qahwa-muted">Aucun événement à venir</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map(({ ev, date }) => {
              const daysLeft = Math.ceil((date.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)
              const color = getEventColor(ev.type)
              return (
                <li key={ev.id} className="flex items-center justify-between rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-2">
                  <div className="flex items-center">
                    <span className={`inline-block h-2 w-2 rounded-full ${color.dot}`} />
                    <span className="font-semibold text-sm ml-2">{ev.title}</span>
                    <span className="ml-2 text-xs text-qahwa-muted">
                      {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-qahwa-orange">J-{daysLeft}</span>
                    <button onClick={() => openEditModal(ev)} className="text-xs text-qahwa-muted underline">Modifier</button>
                    <button onClick={() => handleDelete(ev.id)} className="text-xs text-red-400 underline">Suppr.</button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <form onSubmit={handleSave} className="w-96 space-y-4 rounded-xl border border-qahwa-border bg-qahwa-panel p-6 shadow-panel">
            <h3 className="font-display text-lg uppercase text-qahwa-text">
              {editingEvent ? "Modifier l'événement" : 'Nouvel événement'}
            </h3>
            <div>
              <label className="text-xs uppercase text-qahwa-muted">Titre</label>
              <input required className={`${inputClass} mt-1`} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Ramadan, Anniversaire Sarah..." />
            </div>
            <div>
              <label className="text-xs uppercase text-qahwa-muted">Date</label>
              <input required type="date" className={`${inputClass} mt-1`} value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs uppercase text-qahwa-muted">Type (optionnel)</label>
              <input className={`${inputClass} mt-1`} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="anniversaire, religieux, promo..." />
            </div>
            <div>
              <label className="text-xs uppercase text-qahwa-muted">Notes (optionnel)</label>
              <input className={`${inputClass} mt-1`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm text-qahwa-muted">
              <input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} />
              Se répète chaque année (ex: Noël, anniversaires)
            </label>
            <div className="flex justify-between pt-2">
              {editingEvent && (
                <button type="button" onClick={() => { handleDelete(editingEvent.id); setIsModalOpen(false) }} className="rounded-lg bg-red-500/20 px-4 py-2 text-xs font-bold text-red-400 border border-red-500/40">
                  Supprimer
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-4 py-2 text-xs font-bold uppercase text-qahwa-text">
                  Annuler
                </button>
                <button type="submit" className="rounded-lg bg-qahwa-orange px-4 py-2 text-xs font-bold uppercase text-white">
                  Enregistrer
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}