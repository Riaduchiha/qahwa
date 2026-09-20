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

  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: todayEvents } = await supabase
    .from("employee_clock_events")
    .select("event_type, out_type, created_at")
    .eq("employee_id", emp.id)
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString())
    .order("created_at", { ascending: false });

  const lastEvent = todayEvents?.[0];

  let status: "in" | "choice" | "return";
  if (!lastEvent) {
    status = "in";
  } else if (lastEvent.event_type === "in") {
    status = "choice";
  } else {
    status = "return";
  }

  return NextResponse.json({ employee: emp, status });
}