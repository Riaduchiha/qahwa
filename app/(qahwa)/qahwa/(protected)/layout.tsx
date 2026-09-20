import Image from "next/image";
import DeliveryOrderAlert from "@/components/qahwa/DeliveryOrderAlert";
import TakeawayOrderAlert from "@/components/qahwa/TakeawayOrderAlert";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SidebarNav from "@/components/qahwa/SidebarNav";
import WelcomeToast from "@/components/qahwa/WelcomeToast";
import LowStockAlert from "./LowStockAlert";
import EventAlert from "./EventAlert";

export default async function QahwaAdminLayout({
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
    <div className="flex min-h-screen bg-qahwa-bg text-qahwa-text">
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
        <WelcomeToast />
        <DeliveryOrderAlert />
        <TakeawayOrderAlert />
        <LowStockAlert />
        <EventAlert />
      </div>

      <aside className="flex w-56 shrink-0 flex-col border-r border-qahwa-border bg-qahwa-panel px-4 py-6">
        <div className="mb-8 flex items-center gap-2">
          <Image
            src="/logo-white.png"
            alt="Qahwa"
            width={24}
            height={24}
          />
          <span className="font-display text-sm uppercase tracking-wide text-qahwa-text">
            QAHWA
          </span>
        </div>

        <SidebarNav />
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}