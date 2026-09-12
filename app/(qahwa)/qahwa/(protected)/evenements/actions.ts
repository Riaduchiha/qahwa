'use server'

import { createSupabaseServerClient as _createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const createSupabaseServerClient = () => _createClient() as any

export async function createEvent(data: { title: string; event_date: string; type?: string; notes?: string; recurring?: boolean }) {
  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('events').insert(data)
  if (error) throw new Error(error.message)
  revalidatePath('/qahwa/evenements')
}

export async function updateEvent(id: string, data: Partial<{ title: string; event_date: string; type: string; notes: string; recurring: boolean }>) {
  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('events').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/qahwa/evenements')
}

export async function deleteEvent(id: string) {
  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/qahwa/evenements')
}