import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyPosteSession } from "@/lib/poste/session";

export async function GET() {
  const supabaseAuth = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  const posteToken = cookies().get("poste_session")?.value;
  const posteSession = verifyPosteSession(posteToken);

  if (!user && !posteSession) {
    return NextResponse.json(
      { error: "Non autorise." },
      { status: 401 }
    );
  }

  if (
    !user &&
    posteSession &&
    !["serveur", "caiss"].some((role) =>
      posteSession.position.toLowerCase().includes(role)
    )
  ) {
    return NextResponse.json(
      { error: "Acces tables non autorise." },
      { status: 403 }
    );
  }

  const supabase = createSupabaseAdminClient();

  const { data: tables, error: tablesError } = await supabase
    .from("tables")
    .select("*")
    .order("number", { ascending: true });

  if (tablesError) {
    return NextResponse.json(
      { error: tablesError.message },
      { status: 500 }
    );
  }

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .eq("order_type", "sur_place")
    .eq("paid", false)
    .not("status", "in", '("refusee","annulee")')
    .order("created_at", { ascending: true });

  if (ordersError) {
    return NextResponse.json(
      { error: ordersError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    tables: tables ?? [],
    orders: orders ?? [],
  });
}