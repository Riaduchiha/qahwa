import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createSupabaseAdminClient();

  const { data: tables, error: tablesError } = await supabase
    .from("tables")
    .select("*")
    .order("number");

  if (tablesError) {
    return NextResponse.json({ error: tablesError.message }, { status: 500 });
  }

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .eq("order_type", "sur_place")
    .eq("paid", false)
    .not("status", "in", "(refusee,annulee)");

  if (ordersError) {
    return NextResponse.json({ error: ordersError.message }, { status: 500 });
  }

  return NextResponse.json({ tables, orders });
}