
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function authorize() {
  const supabaseAuth = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  const posteSession =
    cookies().get("poste_session")?.value === "ok";

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

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "ID commande invalide." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { error } = await supabase
      .from("orders")
      .update({ status: "preparation" })
      .eq("id", id)
      .eq("status", "recue");

    if (error) {
      console.error("Dashboard validation error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dashboard PATCH error:", error);

    return NextResponse.json(
      { error: "Erreur serveur." },
      { status: 500 }
    );
  }
}

