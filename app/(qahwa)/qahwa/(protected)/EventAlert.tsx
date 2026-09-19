'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type EventItem = { id: string; title: string; event_date: string; recurring: boolean; type: string | null }

function getEventColor(type: string | null) {
  const t = (type ?? '').toLowerCase()
  if (t.includes('anniversaire')) return { dot: 'bg-pink-400', badge: 'bg-pink-400/20 text-pink-300', border: 'border-pink-400/50', bg: 'bg-pink-400/10' }
  if (t.includes('religi')) return { dot: 'bg-emerald-400', badge: 'bg-emerald-400/20 text-emerald-300', border: 'border-emerald-400/50', bg: 'bg-emerald-400/10' }
  if (t.includes('promo')) return { dot: 'bg-blue-400', badge: 'bg-blue-400/20 text-blue-300', border: 'border-blue-400/50', bg: 'bg-blue-400/10' }
  if (t.includes('off') || t.includes('fermeture') || t.includes('congé') || t.includes('conge')) return { dot: 'bg-red-500', badge: 'bg-red-500/20 text-red-400', border: 'border-red-500/50', bg: 'bg-red-500/10' }
  return { dot: 'bg-qahwa-orange', badge: 'bg-qahwa-orange/20 text-qahwa-orange', border: 'border-qahwa-orange/50', bg: 'bg-qahwa-orange/10' }
}

function daysUntil(ev: EventItem) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const d = new Date(ev.event_date + 'T00:00:00')
  if (ev.recurring) {
    d.setFullYear(now.getFullYear())
    if (d < now) d.setFullYear(now.getFullYear() + 1)
  }
  return Math.ceil((d.getTime() - now.getTime()) / 86400000)
}

export default function EventAlert() {
  const [soon, setSoon] = useState<EventItem[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(false)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    async function check() {
      const { data } = await supabase.from('events').select('id, title, event_date, recurring, type')
      const upcoming = (data ?? []).filter((ev: EventItem) => {
        const days = daysUntil(ev)
        return days >= 0 && days <= 7
      })
      setSoon(upcoming)
    }
    check()
  }, [supabase])

  useEffect(() => {
    if (soon.length > 0 && !dismissed) {
      const t = setTimeout(() => setVisible(true), 50)
      return () => clearTimeout(t)
    }
  }, [soon, dismissed])

  if (dismissed || soon.length === 0) return null

  const firstEvent = soon[0]
  if (!firstEvent) return null
  const cardColor = getEventColor(firstEvent.type)

  return (
    <div
      className={`w-80 max-w-[90vw] rounded-2xl border ${cardColor.border} ${cardColor.bg} p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">📅</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-white mb-1">Événement à venir</p>
          <ul className="text-xs text-white/90 space-y-1">
            {soon.map((ev) => {
              const color = getEventColor(ev.type)
              return (
                <li key={ev.id} className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
                  {ev.title} — dans {daysUntil(ev)} jour{daysUntil(ev) > 1 ? 's' : ''}
                </li>
              )
            })}
          </ul>
        </div>
        <button onClick={() => setDismissed(true)} className="text-white/70 hover:text-white text-sm font-bold">✕</button>
      </div>
    </div>
  )
}