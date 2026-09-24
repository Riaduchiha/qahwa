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
    !["serveur", "caiss"].some((role) =>
      posteSession.position.toLowerCase().includes(role)
    )
  ) {
    return NextResponse.json(
      { error: "Acces tables non autorise." },
      { status: 403 }
    );
  }

  let body: {
    order_id?: unknown;
    table_id?: unknown;
    action?: unknown;
    reserved?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Requete invalide." },
      { status: 400 }
    );
  }

  const orderId =
    typeof body.order_id === "string" ? body.order_id : null;

  const tableId =
    typeof body.table_id === "string" ? body.table_id : null;

  const action =
    typeof body.action === "string" ? body.action : null;

  const reserved =
    typeof body.reserved === "boolean" ? body.reserved : null;

  const supabase = createSupabaseAdminClient();

  // RESERVER / LIBERER UNE TABLE
  if (action === "reserve") {
    if (!tableId || reserved === null) {
      return NextResponse.json(
        { error: "Donnees manquantes." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("tables")
      .update({ reserved })
      .eq("id", tableId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  }

  if (!orderId) {
    return NextResponse.json(
      { error: "order_id manquant." },
      { status: 400 }
    );
  }

  // RECUPERE LA COMMANDE
  // IMPORTANT : les commandes utilisent table_number,
  // pas table_id.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, table_number, order_type, status, paid")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json(
      { error: orderError.message },
      { status: 500 }
    );
  }

  if (!order) {
    return NextResponse.json(
      { error: "Commande introuvable." },
      { status: 404 }
    );
  }

  if (order.order_type !== "sur_place") {
    return NextResponse.json(
      { error: "Cette commande n'est pas une commande sur place." },
      { status: 400 }
    );
  }

  // MARQUER SERVI
  if (action === "served") {
    const { error } = await supabase
      .from("orders")
      .update({ status: "servi" })
      .eq("id", orderId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  }

  // ENCAISSER
  if (action === "paid") {
    const { error: orderUpdateError } = await supabase
      .from("orders")
      .update({
        paid: true,
        status: "livree",
      })
      .eq("id", orderId);

    if (orderUpdateError) {
      return NextResponse.json(
        { error: orderUpdateError.message },
        { status: 500 }
      );
    }

    // La page Tables nous envoie directement l'id de la table.
    if (tableId) {
      const { error: tableError } = await supabase
        .from("tables")
        .update({ reserved: false })
        .eq("id", tableId);

      if (tableError) {
        return NextResponse.json(
          { error: tableError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: "Action inconnue." },
    { status: 400 }
  );
}