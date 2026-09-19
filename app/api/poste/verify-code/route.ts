import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { code } = await request.json();

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Code manquant." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: emp, error } = await supabase
    .from("employees")
    .select("id, name, position, photo_url")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();

  if (error || !emp) {
    return NextResponse.json({ error: "Code non reconnu." }, { status: 404 });
  }

  const { data: lastEvent } = await supabase
    .from("employee_clock_events")
    .select("event_type")
    .eq("employee_id", emp.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextAction = !lastEvent || lastEvent.event_type === "out" ? "in" : "out";

  return NextResponse.json({ employee: emp, nextAction });
}