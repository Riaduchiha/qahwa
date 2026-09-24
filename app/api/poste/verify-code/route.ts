import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createPosteSession } from "@/lib/poste/session";

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 60 * 1000;

const attempts = new Map<
  string,
  { count: number; blockedUntil: number }
>();

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const now = Date.now();
  const entry = attempts.get(ip);

  if (entry && entry.blockedUntil > now) {
    const secondsLeft = Math.ceil(
      (entry.blockedUntil - now) / 1000
    );

    return NextResponse.json(
      {
        error: `Trop de tentatives. Reessaie dans ${secondsLeft}s.`,
      },
      { status: 429 }
    );
  }

  let body: { code?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Requete invalide." },
      { status: 400 }
    );
  }

  const code = body.code;

  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json(
      { error: "Code manquant." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();

  const { data: emp, error } = await supabase
    .from("employees")
    .select("id, name, position, photo_url")
    .eq("code", code.trim())
    .eq("active", true)
    .maybeSingle();

  if (error || !emp) {
    const current = attempts.get(ip) ?? {
      count: 0,
      blockedUntil: 0,
    };

    const newCount = current.count + 1;

    if (newCount >= MAX_ATTEMPTS) {
      attempts.set(ip, {
        count: 0,
        blockedUntil: now + BLOCK_DURATION_MS,
      });
    } else {
      attempts.set(ip, {
        count: newCount,
        blockedUntil: 0,
      });
    }

    return NextResponse.json(
      { error: "Code non reconnu." },
      { status: 404 }
    );
  }

  attempts.delete(ip);

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

  const sessionToken = createPosteSession(
    emp.id,
    emp.position
  );

  const response = NextResponse.json({
    employee: emp,
    status,
  });

  response.cookies.set("poste_session", sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return response;
}