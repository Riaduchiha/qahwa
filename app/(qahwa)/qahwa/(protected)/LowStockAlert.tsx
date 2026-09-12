'use client'

import { useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type Ingredient = {
  id: string
  name: string
  quantity_in_stock: number
  unit: string
  alert_threshold: number
}

function playAlertSound() {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  const now = ctx.currentTime

  // deux petits bips
  ;[0, 0.18].forEach((delay) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now + delay)
    gain.gain.setValueAtTime(0, now + delay)
    gain.gain.linearRampToValueAtTime(0.15, now + delay + 0.02)
    gain.gain.linearRampToValueAtTime(0, now + delay + 0.15)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now + delay)
    osc.stop(now + delay + 0.16)
  })
}

export default function LowStockAlert() {
  const [lowStock, setLowStock] = useState<Ingredient[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(false)
  const hasPlayedSound = useRef(false)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    async function check() {
      const { data } = await supabase.from('ingredients').select('*')
      const low = (data ?? []).filter(
        (i: Ingredient) => i.quantity_in_stock <= i.alert_threshold
      )
      setLowStock(low)

      if (low.length > 0 && !hasPlayedSound.current) {
        hasPlayedSound.current = true
        try {
          playAlertSound()
        } catch {
          // navigateur peut bloquer le son avant une interaction, on ignore l'erreur
        }
      }
    }
    check()
  }, [supabase])

  useEffect(() => {
    if (lowStock.length > 0 && !dismissed) {
      const t = setTimeout(() => setVisible(true), 50)
      return () => clearTimeout(t)
    }
  }, [lowStock, dismissed])

  if (dismissed || lowStock.length === 0) return null

  return (
    <div
      className={`fixed top-4 right-4 z-50 w-80 max-w-[90vw] rounded-2xl border border-red-400/30 bg-red-500/15 p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">⚠️</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-white mb-1">Stock faible</p>
          <ul className="text-xs text-red-100 space-y-0.5">
            {lowStock.map((i) => (
              <li key={i.id}>
                {i.name} — {i.quantity_in_stock}
                {i.unit}
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-white/70 hover:text-white text-sm font-bold"
        >
          ✕
        </button>
      </div>
    </div>
  )
}