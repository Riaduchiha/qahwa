import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const metadata = {
  title: "QAHWA",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "QAHWA",
  },
};
export default async function PosteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/qahwa/login");
  }

  return (
    <div className="min-h-screen bg-qahwa-bg text-qahwa-text">
      {children}
    </div>
  );
}