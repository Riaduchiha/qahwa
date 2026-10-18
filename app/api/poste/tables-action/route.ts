import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyPosteSession } from "@/lib/poste/session";

const ACTIVE_STATUSES = [
  "recue",
  "preparation",
  "prete",
  "servi",
  "livraison",
];

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
    target_table_id?: unknown;
    merge_order_id?: unknown;
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

  const targetTableId =
    typeof body.target_table_id === "string"
      ? body.target_table_id
      : null;

  const mergeOrderId =
    typeof body.merge_order_id === "string"
      ? body.merge_order_id
      : null;

  const action =
    typeof body.action === "string" ? body.action : null;

  const reserved =
    typeof body.reserved === "boolean" ? body.reserved : null;

  const supabase = createSupabaseAdminClient();

  // ============================================================
  // RESERVER / LIBERER UNE TABLE
  // ============================================================

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

  // ============================================================
  // POUR TOUTES LES ACTIONS SUR UNE COMMANDE
  // ============================================================

  if (!orderId) {
    return NextResponse.json(
      { error: "order_id manquant." },
      { status: 400 }
    );
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, table_number, order_type, status, paid, total"
    )
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

   // Les commandes à emporter et en livraison peuvent seulement être encaissées.
  // Changer de table, fusionner et marquer servie restent réservés au sur place.
  if (order.order_type !== "sur_place" && action !== "paid") {
    return NextResponse.json(
      {
        error: "Cette action est réservée aux commandes sur place.",
      },
      { status: 400 }
    );
  }
  // ============================================================
  // CHANGER DE TABLE
  // ============================================================

  if (action === "change_table") {
    if (!targetTableId) {
      return NextResponse.json(
        { error: "Table destination manquante." },
        { status: 400 }
      );
    }

    if (targetTableId === tableId) {
      return NextResponse.json(
        { error: "La table destination est identique." },
        { status: 400 }
      );
    }

    const { data: targetTable, error: targetTableError } =
      await supabase
        .from("tables")
        .select("id, number, is_active, reserved")
        .eq("id", targetTableId)
        .maybeSingle();

    if (targetTableError) {
      return NextResponse.json(
        { error: targetTableError.message },
        { status: 500 }
      );
    }

    if (!targetTable) {
      return NextResponse.json(
        { error: "Table destination introuvable." },
        { status: 404 }
      );
    }

    if (!targetTable.is_active) {
      return NextResponse.json(
        { error: "Cette table est inactive." },
        { status: 400 }
      );
    }

    if (targetTable.reserved) {
      return NextResponse.json(
        { error: "Cette table est reservee." },
        { status: 400 }
      );
    }

    // Vérifie qu'une autre commande active n'occupe pas
    // déjà la table destination.
    const { data: existingOrders, error: existingError } =
      await supabase
        .from("orders")
        .select("id, order_number, status, paid")
        .eq("order_type", "sur_place")
        .eq("table_number", String(targetTable.number))
        .eq("paid", false)
        .in("status", ACTIVE_STATUSES);

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    if (existingOrders && existingOrders.length > 0) {
      return NextResponse.json(
        {
          error: `La table ${targetTable.number} est deja occupee.`,
        },
        { status: 409 }
      );
    }

    // IMPORTANT :
    // On change uniquement table_number.
    // La commande, ses articles et leur statut KDS
    // restent exactement les mêmes.
    const { error: moveError } = await supabase
      .from("orders")
      .update({
        table_number: String(targetTable.number),
      })
      .eq("id", orderId);

    if (moveError) {
      return NextResponse.json(
        { error: moveError.message },
        { status: 500 }
      );
    }

    // L'ancienne table redevient libre.
    if (tableId) {
      await supabase
        .from("tables")
        .update({ reserved: false })
        .eq("id", tableId);
    }

    // La table destination est maintenant occupée
    // par la commande déplacée.
    await supabase
      .from("tables")
      .update({ reserved: false })
      .eq("id", targetTableId);

    return NextResponse.json({
      ok: true,
      table_number: targetTable.number,
    });
  }

  // ============================================================
  // MARQUER SERVI
  // ============================================================

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

  // ============================================================
  // ENCAISSER UNE SEULE TABLE
  // ============================================================

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

  // ============================================================
  // FUSIONNER L'ENCAISSEMENT
  //
  // IMPORTANT :
  // - Les 2 commandes restent séparées.
  // - Aucun order_item n'est déplacé.
  // - Aucun changement de table.
  // - Aucun changement KDS.
  // - On encaisse simplement les 2 commandes ensemble.
  // ============================================================

  if (action === "merge_paid") {
    if (!mergeOrderId) {
      return NextResponse.json(
        { error: "Deuxieme commande manquante." },
        { status: 400 }
      );
    }

    if (mergeOrderId === orderId) {
      return NextResponse.json(
        { error: "Impossible de fusionner la meme commande." },
        { status: 400 }
      );
    }

    const { data: secondOrder, error: secondOrderError } =
      await supabase
        .from("orders")
        .select(
          "id, table_number, order_type, status, paid, total"
        )
        .eq("id", mergeOrderId)
        .maybeSingle();

    if (secondOrderError) {
      return NextResponse.json(
        { error: secondOrderError.message },
        { status: 500 }
      );
    }

    if (!secondOrder) {
      return NextResponse.json(
        { error: "Deuxieme commande introuvable." },
        { status: 404 }
      );
    }

    if (secondOrder.order_type !== "sur_place") {
      return NextResponse.json(
        {
          error:
            "La deuxieme commande n'est pas une commande sur place.",
        },
        { status: 400 }
      );
    }

    if (order.paid || secondOrder.paid) {
      return NextResponse.json(
        { error: "Une des commandes est deja encaissee." },
        { status: 400 }
      );
    }

    if (
      !ACTIVE_STATUSES.includes(order.status) ||
      !ACTIVE_STATUSES.includes(secondOrder.status)
    ) {
      return NextResponse.json(
        {
          error:
            "Les deux commandes doivent encore etre actives.",
        },
        { status: 400 }
      );
    }

    if (
      !order.table_number ||
      !secondOrder.table_number
    ) {
      return NextResponse.json(
        { error: "Une des commandes n'a pas de table." },
        { status: 400 }
      );
    }

    if (order.table_number === secondOrder.table_number) {
      return NextResponse.json(
        {
          error:
            "Les deux commandes sont deja sur la meme table.",
        },
        { status: 400 }
      );
    }

    // On encaisse les deux commandes séparément dans la base.
    // Elles restent donc totalement distinctes.
    const { error: firstPaidError } = await supabase
      .from("orders")
      .update({
        paid: true,
        status: "livree",
      })
      .eq("id", orderId)
      .eq("paid", false);

    if (firstPaidError) {
      return NextResponse.json(
        { error: firstPaidError.message },
        { status: 500 }
      );
    }

    const { error: secondPaidError } = await supabase
      .from("orders")
      .update({
        paid: true,
        status: "livree",
      })
      .eq("id", mergeOrderId)
      .eq("paid", false);

    if (secondPaidError) {
      // Tentative de retour arrière si la deuxième mise à jour
      // échoue après la première.
      await supabase
        .from("orders")
        .update({
          paid: false,
          status: order.status,
        })
        .eq("id", orderId);

      return NextResponse.json(
        { error: secondPaidError.message },
        { status: 500 }
      );
    }

    // Libère les deux tables.
    if (tableId) {
      await supabase
        .from("tables")
        .update({ reserved: false })
        .eq("id", tableId);
    }

    const { data: secondTable } = await supabase
      .from("tables")
      .select("id")
      .eq("number", Number(secondOrder.table_number))
      .maybeSingle();

    if (secondTable) {
      await supabase
        .from("tables")
        .update({ reserved: false })
        .eq("id", secondTable.id);
    }

    return NextResponse.json({
      ok: true,
      merged_payment: true,
      total: order.total + secondOrder.total,
    });
  }

  return NextResponse.json(
    { error: "Action inconnue." },
    { status: 400 }
  );
}