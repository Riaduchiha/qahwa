import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // Autorise la session Supabase classique (dashboard)
    const supabaseAuth = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    // Ou la session Poste
    const posteSession = cookies().get("poste_session")?.value === "ok";

    if (!user && !posteSession) {
      return NextResponse.json(
        { error: "Non autorise." },
        { status: 401 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: tables, error: tablesError } = await supabase
      .from("tables")
      .select("*")
      .order("number");

    if (tablesError) {
      console.error("Erreur récupération tables:", tablesError);
      return NextResponse.json(
        { error: "Impossible de récupérer les tables." },
        { status: 500 }
      );
    }

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .eq("order_type", "sur_place")
      .eq("paid", false)
      .not("status", "in", "(refusee,annulee)");

    if (ordersError) {
      console.error("Erreur récupération commandes:", ordersError);
      return NextResponse.json(
        { error: "Impossible de récupérer les commandes." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tables: tables ?? [],
      orders: orders ?? [],
    });
  } catch (error) {
    console.error("Erreur API tables-data:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}