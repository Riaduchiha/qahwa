
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // Autorise la session Supabase du Dashboard
    const supabaseAuth = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    // Autorise aussi la session POSTE
    const cookieStore = cookies();

    const posteSession =
      cookieStore.get("poste_session")?.value === "ok";

    if (!user && !posteSession) {
      return NextResponse.json(
        { error: "Non autorise." },
        { status: 401 }
      );
    }

    // Lecture avec les droits admin
    const supabase = createSupabaseAdminClient();

    const { data: activeOrders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .or(
        "status.eq.preparation,and(status.eq.recue,order_type.eq.sur_place)"
      )
      .order("created_at", { ascending: true });

    if (ordersError) {
      console.error("KDS orders error:", ordersError);

      return NextResponse.json(
        { error: ordersError.message },
        { status: 500 }
      );
    }

    if (!activeOrders || activeOrders.length === 0) {
      return NextResponse.json([]);
    }

    const orderIds = activeOrders.map((order) => order.id);

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", orderIds);

    if (itemsError) {
      console.error("KDS items error:", itemsError);

      return NextResponse.json(
        { error: itemsError.message },
        { status: 500 }
      );
    }

    const result = activeOrders
      .map((order) => ({
        ...order,
        order_items: (items ?? []).filter(
          (item) => item.order_id === order.id
        ),
      }))
      .filter((order) => order.order_items.length > 0);

    return NextResponse.json(result);
  } catch (error) {
    console.error("KDS API error:", error);

    return NextResponse.json(
      { error: "Erreur serveur KDS." },
      { status: 500 }
    );
  }
}

