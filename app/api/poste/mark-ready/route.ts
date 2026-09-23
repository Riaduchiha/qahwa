import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    // 1. Autorise si session Supabase classique (dashboard)
    const supabaseAuth = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    // 2. Sinon, autorise si cookie pose par verify-code (Poste)
    const posteSession = cookies().get("poste_session")?.value === "ok";

    if (!user && !posteSession) {
      return NextResponse.json(
        { error: "Non autorise." },
        { status: 401 }
      );
    }

    // 2. Lire et vérifier la requête
    const body = await request.json();
    const item_id = body?.item_id;

    if (typeof item_id !== "string" || !item_id.trim()) {
      return NextResponse.json(
        { error: "item_id manquant." },
        { status: 400 }
      );
    }

    // 3. Client admin uniquement après vérification
    const supabase = createSupabaseAdminClient();

    // 4. Vérifier que l'article existe et récupérer sa commande
    const { data: itemRow, error: itemError } = await supabase
      .from("order_items")
      .select("id, order_id, status")
      .eq("id", item_id)
      .maybeSingle();

    if (itemError) {
      console.error("Erreur lecture order_item:", itemError);

      return NextResponse.json(
        { error: "Impossible de vérifier l'article." },
        { status: 500 }
      );
    }

    if (!itemRow) {
      return NextResponse.json(
        { error: "Article introuvable." },
        { status: 404 }
      );
    }

    // 5. Vérifier la commande associée
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", itemRow.order_id)
      .maybeSingle();

    if (orderError) {
      console.error("Erreur lecture commande:", orderError);

      return NextResponse.json(
        { error: "Impossible de vérifier la commande." },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: "Commande introuvable." },
        { status: 404 }
      );
    }

    // 6. Une commande déjà terminée ne doit plus être modifiée
    if (["livree", "refusee", "annulee"].includes(order.status)) {
      return NextResponse.json(
        { error: "Cette commande est déjà terminée." },
        { status: 409 }
      );
    }

    // 7. Marquer l'article comme prêt
    const { error: updateError } = await supabase
      .from("order_items")
      .update({ status: "ready" })
      .eq("id", item_id);

    if (updateError) {
      console.error("Erreur mise à jour article:", updateError);

      return NextResponse.json(
        { error: "Impossible de marquer l'article comme prêt." },
        { status: 500 }
      );
    }

    // 8. Récupérer tous les articles de la commande
    const { data: freshItems, error: itemsError } = await supabase
      .from("order_items")
      .select("status")
      .eq("order_id", itemRow.order_id);

    if (itemsError) {
      console.error("Erreur récupération articles:", itemsError);

      return NextResponse.json(
        { error: "Impossible de vérifier les articles." },
        { status: 500 }
      );
    }

    // Sécurité : une commande sans article ne doit jamais devenir "prete"
    const allReady =
      freshItems.length > 0 &&
      freshItems.every((item) => item.status === "ready");

    // 9. Si TOUS les articles sont prêts → commande prête
    if (allReady) {
      const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({ status: "prete" })
        .eq("id", itemRow.order_id);

      if (orderUpdateError) {
        console.error(
          "Erreur passage commande à prete:",
          orderUpdateError
        );

        return NextResponse.json(
          { error: "Impossible de mettre la commande à jour." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      order_ready: allReady,
    });
  } catch (error) {
    console.error("Erreur API mark-ready:", error);

    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}