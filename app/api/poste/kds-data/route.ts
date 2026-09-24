import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyPosteSession } from "@/lib/poste/session";

export async function GET() {
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

  // Un poste avec session employee doit etre barista
  // pour acceder au KDS.
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

  const supabase = createSupabaseAdminClient();

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .or("status.eq.preparation,and(status.eq.recue,order_type.eq.sur_place)")
    .order("created_at", { ascending: true });

  if (ordersError) {
    return NextResponse.json(
      { error: ordersError.message },
      { status: 500 }
    );
  }

  if (!orders || orders.length === 0) {
    return NextResponse.json({
      orders: [],
      items: [],
    });
  }

  const orderIds = orders.map((order) => order.id);
const { data: items, error: itemsError } = await supabase
  .from("order_items")
  .select("*")
  .in("order_id", orderIds);

  if (itemsError) {
    return NextResponse.json(
      { error: itemsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    orders,
    items: items ?? [],
  });
}