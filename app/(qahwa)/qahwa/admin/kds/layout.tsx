import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function KdsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/qahwa/login");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-qahwa-black">
      {children}
    </div>
  );
}