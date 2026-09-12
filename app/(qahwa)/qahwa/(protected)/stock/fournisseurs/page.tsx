import { createSupabaseServerClient } from '@/lib/supabase/server'
import SuppliersManager from './SuppliersManager'

export default async function FournisseursPage() {
  const supabase = createSupabaseServerClient()

  const { data: suppliers } = await supabase.from('suppliers').select('*').order('name')
  const { data: ingredients } = await supabase.from('ingredients').select('id, name, unit').order('name')
  const { data: links } = await supabase.from('ingredient_suppliers').select('*')

  return (
    <SuppliersManager
      initialSuppliers={suppliers ?? []}
      ingredients={ingredients ?? []}
      initialLinks={links ?? []}
    />
  )
}