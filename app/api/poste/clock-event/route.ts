import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const formData = await request.formData();
  const employeeId = formData.get("employee_id") as string;
  const eventType = formData.get("event_type") as string;
  const outType = formData.get("out_type") as string | null;
  const photo = formData.get("photo") as File | null;

  if (!employeeId || !eventType) {
    return NextResponse.json({ error: "Donnees manquantes." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: emp, error: empError } = await supabase
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("active", true)
    .maybeSingle();

  if (empError || !emp) {
    return NextResponse.json({ error: "Employe introuvable." }, { status: 404 });
  }

  let photoUrl: string | null = null;

  if (photo) {
    const fileName = `${employeeId}-${Date.now()}.jpg`;
    const buffer = Buffer.from(await photo.arrayBuffer());

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("employee-photos")
      .upload(fileName, buffer, { contentType: "image/jpeg" });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    if (uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from("employee-photos")
        .getPublicUrl(uploadData.path);
      photoUrl = publicUrlData.publicUrl;
    }
  }

  const { error: insertError } = await supabase.from("employee_clock_events").insert({
    employee_id: employeeId,
    event_type: eventType,
    out_type: eventType === "out" ? outType : null,
    photo_url: photoUrl,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, photo_url: photoUrl });
}