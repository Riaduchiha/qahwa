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

  const cookieStore = cookies();
  const posteToken = cookieStore.get("poste_session")?.value;
  const posteSession = verifyPosteSession(posteToken);

  if (!user && !posteSession) {
    return NextResponse.json(
      { error: "Non autorise." },
      { status: 401 }
    );
  }

  const formData = await request.formData();

  const employeeId = formData.get("employee_id");
  const eventType = formData.get("event_type");
  const outType = formData.get("out_type");
  const photo = formData.get("photo");

  if (
    typeof employeeId !== "string" ||
    typeof eventType !== "string"
  ) {
    return NextResponse.json(
      { error: "Donnees manquantes." },
      { status: 400 }
    );
  }

  // Si la requete vient du poste,
  // elle ne peut enregistrer que l'employe connecte.
  if (posteSession && !user && employeeId !== posteSession.employeeId) {
    return NextResponse.json(
      { error: "Employe non autorise." },
      { status: 403 }
    );
  }

  const supabase = createSupabaseAdminClient();

  const { data: emp, error: empError } = await supabase
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("active", true)
    .maybeSingle();

  if (empError || !emp) {
    return NextResponse.json(
      { error: "Employe introuvable." },
      { status: 404 }
    );
  }

  let photoUrl: string | null = null;

  if (photo instanceof File && photo.size > 0) {
    const fileName = `${employeeId}-${Date.now()}.jpg`;
    const buffer = Buffer.from(await photo.arrayBuffer());

    const { data: uploadData, error: uploadError } =
      await supabase.storage
        .from("employee-photos")
        .upload(fileName, buffer, {
          contentType: "image/jpeg",
        });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    if (uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from("employee-photos")
        .getPublicUrl(uploadData.path);

      photoUrl = publicUrlData.publicUrl;
    }
  }

  const { error: insertError } = await supabase
    .from("employee_clock_events")
    .insert({
      employee_id: employeeId,
      event_type: eventType,
      out_type:
        eventType === "out" && typeof outType === "string"
          ? outType
          : null,
      photo_url: photoUrl,
    });

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    photo_url: photoUrl,
  });
}