'use client'

import { useEffect, useState } from 'react'

export default function WelcomeToast() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  if (dismissed) return null

  return (
    <div
      className={`w-72 max-w-[90vw] rounded-2xl border border-white/10 bg-black/60 p-4 shadow-2xl backdrop-blur-xl transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex items-center gap-3">
        <img src="/logo-white.png" alt="Qahwa" className="h-8 w-8 object-contain" />
        <div className="flex-1">
          <p className="text-sm font-bold text-white">Bonjour Ines</p>
          <p className="text-xs text-white/60">Content de te revoir</p>
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