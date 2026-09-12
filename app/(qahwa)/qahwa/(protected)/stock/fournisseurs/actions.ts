'use server'

import { createSupabaseServerClient as _createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const createSupabaseServerClient = () => _createClient() as any

export async function createSupplier(data: { name: string; phone?: string; address?: string }) {
  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('suppliers').insert(data)
  if (error) throw new Error(error.message)
  revalidatePath('/qahwa/stock/fournisseurs')
}

export async function updateSupplier(id: string, data: Partial<{ name: string; phone: string; address: string }>) {
  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('suppliers').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/qahwa/stock/fournisseurs')
}

export async function deleteSupplier(id: string) {
  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('suppliers').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/qahwa/stock/fournisseurs')
}

export async function upsertIngredientSupplier(ingredientId: string, supplierId: string, price: number) {
  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('ingredient_suppliers')
    .upsert({ ingredient_id: ingredientId, supplier_id: supplierId, price }, { onConflict: 'ingredient_id,supplier_id' })
  if (error) throw new Error(error.message)
  revalidatePath('/qahwa/stock/fournisseurs')
}

export async function deleteIngredientSupplier(ingredientId: string, supplierId: string) {
  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('ingredient_suppliers')
    .delete()
    .eq('ingredient_id', ingredientId)
    .eq('supplier_id', supplierId)
  if (error) throw new Error(error.message)
  revalidatePath('/qahwa/stock/fournisseurs')
}