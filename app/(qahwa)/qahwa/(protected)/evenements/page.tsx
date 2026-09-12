import { createSupabaseServerClient } from '@/lib/supabase/server'
import EventsCalendar from './EventsCalendar'

export default async function EvenementsPage() {
  const supabase = createSupabaseServerClient()
  const { data: events } = await supabase.from('events').select('*').order('event_date')

  return <EventsCalendar initialEvents={events ?? []} />
}