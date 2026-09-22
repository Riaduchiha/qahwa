import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { order_id, table_id, action, reserved } = await request.json();

  const supabase = createSupabaseAdminClient();

  if (action === "reserve") {
    if (!table_id) {
      return NextResponse.json({ error: "table_id manquant." }, { status: 400 });
    }
    const { error } = await supabase
      .from("tables")
      .update({ reserved })
      .eq("id", table_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (!order_id) {
    return NextResponse.json({ error: "Donnees manquantes." }, { status: 400 });
  }

  if (action === "served") {
    const { error } = await supabase
      .from("orders")
      .update({ status: "servi" })
      .eq("id", order_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "paid") {
    const { error: orderError } = await supabase
      .from("orders")
      .update({ paid: true })
      .eq("id", order_id);

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    if (table_id) {
      const { error: tableError } = await supabase
        .from("tables")
        .update({ reserved: false })
        .eq("id", table_id);

      if (tableError) {
        return NextResponse.json({ error: tableError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}