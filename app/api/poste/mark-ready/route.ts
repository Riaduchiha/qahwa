import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { item_id } = await request.json();

  if (!item_id) {
    return NextResponse.json({ error: "item_id manquant." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { error: updateError } = await supabase
    .from("order_items")
    .update({ status: "ready" })
    .eq("id", item_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: itemRow } = await supabase
    .from("order_items")
    .select("order_id")
    .eq("id", item_id)
    .single();

  if (itemRow) {
    const { data: freshItems } = await supabase
      .from("order_items")
      .select("status")
      .eq("order_id", itemRow.order_id);

    const allReady = (freshItems ?? []).every((i) => i.status === "ready");
    if (allReady) {
      await supabase
        .from("orders")
        .update({ status: "prete" })
        .eq("id", itemRow.order_id);
    }
  }

  return NextResponse.json({ ok: true });
}