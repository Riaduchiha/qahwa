
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyPosteSession } from "@/lib/poste/session";


async function authorize() {
  const supabaseAuth = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  const posteToken = cookies().get("poste_session")?.value;
  const posteSession = verifyPosteSession(posteToken);

  return Boolean(user || posteSession);
}


export async function GET() {
  try {
    const authorized = await authorize();

    if (!authorized) {
      return NextResponse.json(
        { error: "Non autorise." },
        { status: 401 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "recue")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Dashboard orders error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("Dashboard API error:", error);

    return NextResponse.json(
      { error: "Erreur serveur." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const authorized = await authorize();

    if (!authorized) {
      return NextResponse.json(
        { error: "Non autorise." },
        { status: 401 }
      );
    }

    
    const body = await request.json();
    const id = body?.id;
    const action = body?.action ?? "accept";

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "ID commande invalide." },
        { status: 400 }
      );
    }

    if (action !== "accept" && action !== "refuse") {
      return NextResponse.json(
        { error: "Action invalide." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: order, error: findError } = await supabase
      .from("orders")
      .select("id, order_type, status")
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { error: findError.message },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: "Commande introuvable." },
        { status: 404 }
      );
    }

    if (
      order.order_type !== "livraison" &&
      order.order_type !== "emporter"
    ) {
      return NextResponse.json(
        { error: "Cette action est réservée aux commandes livraison et à emporter." },
        { status: 400 }
      );
    }

    if (order.status !== "recue") {
      return NextResponse.json(
        { error: "Cette commande a déjà été traitée." },
        { status: 409 }
      );
    }

    const newStatus = action === "accept" ? "preparation" : "refusee";

    const { data: updated, error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", id)
      .eq("status", "recue")
      .select("id, status")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!updated) {
      return NextResponse.json(
        { error: "La commande a déjà été traitée par un autre utilisateur." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      status: updated.status,
    });
  } catch (error) {
    console.error("Dashboard PATCH error:", error);

    return NextResponse.json(
      { error: "Erreur serveur." },
      { status: 500 }
    );
  }
}

