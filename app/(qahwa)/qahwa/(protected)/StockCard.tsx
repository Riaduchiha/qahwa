import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function StockCard() {
  const supabase = await createSupabaseServerClient()
  const { data: ingredients } = await supabase.from('ingredients').select('*')
  const lowStock = ((ingredients as any[]) ?? []).filter((i) => i.quantity_in_stock <= i.alert_threshold)

  return (
    <Link href="/qahwa/stock" className="block rounded-xl border border-qahwa-border bg-qahwa-panel p-4 shadow-panel hover:border-qahwa-orange transition">
      <h3 className="font-display uppercase text-lg text-qahwa-text mb-2">Stock</h3>
      {lowStock.length === 0 ? (
        <p className="text-sm text-qahwa-muted">Tous les stocks sont OK</p>
      ) : (
        <div>
          <p className="text-sm font-bold text-qahwa-rouge mb-1">
            {lowStock.length} ingrédient{lowStock.length > 1 ? 's' : ''} en alerte
          </p>
          <ul className="text-sm text-qahwa-text">
            {lowStock.slice(0, 3).map((i) => (
              <li key={i.id}>
                {i.name} — {i.quantity_in_stock} {i.unit}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Link>
  )
}