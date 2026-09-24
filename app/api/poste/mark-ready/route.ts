import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyPosteSession } from "@/lib/poste/session";

export async function POST(request: Request) {
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
    !posteSession.position.toLowerCase().includes("barista")
  ) {
    return NextResponse.json(
      { error: "Acces KDS non autorise." },
      { status: 403 }
    );
  }

  let body: { item_id?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Requete invalide." },
      { status: 400 }
    );
  }

  const itemId = body.item_id;

  if (typeof itemId !== "string" || !itemId) {
    return NextResponse.json(
      { error: "item_id manquant." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();

  const { data: item, error: itemError } = await supabase
    .from("order_items")
    .select("id, order_id, status")
    .eq("id", itemId)
    .maybeSingle();

  if (itemError || !item) {
    return NextResponse.json(
      { error: "Article introuvable." },
      { status: 404 }
    );
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", item.order_id)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json(
      { error: "Commande introuvable." },
      { status: 404 }
    );
  }

  if (
    order.status === "livree" ||
    order.status === "refusee" ||
    order.status === "annulee"
  ) {
    return NextResponse.json(
      { error: "Cette commande n'est plus active." },
      { status: 400 }
    );
  }

  const { error: updateItemError } = await supabase
    .from("order_items")
    .update({ status: "ready" })
    .eq("id", itemId);

  if (updateItemError) {
    return NextResponse.json(
      { error: updateItemError.message },
      { status: 500 }
    );
  }

  const { data: remainingItems, error: remainingError } =
    await supabase
      .from("order_items")
      .select("status")
      .eq("order_id", item.order_id);

  if (remainingError) {
    return NextResponse.json(
      { error: remainingError.message },
      { status: 500 }
    );
  }

  const allReady =
    remainingItems !== null &&
    remainingItems.length > 0 &&
    remainingItems.every((orderItem) => orderItem.status === "ready");

  if (allReady) {
    const { error: orderUpdateError } = await supabase
      .from("orders")
      .update({ status: "prete" })
      .eq("id", item.order_id);

    if (orderUpdateError) {
      return NextResponse.json(
        { error: orderUpdateError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    order_ready: allReady,
  });
}