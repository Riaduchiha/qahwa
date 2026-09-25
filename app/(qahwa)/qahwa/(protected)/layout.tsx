import Image from "next/image";
import DeliveryOrderAlert from "@/components/qahwa/DeliveryOrderAlert";
import TakeawayOrderAlert from "@/components/qahwa/TakeawayOrderAlert";
import AudioUnlock from "@/components/qahwa/AudioUnlock";
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
    <div className="min-h-screen bg-qahwa-bg text-qahwa-text">
      <AudioUnlock />

      <div className="fixed right-3 top-3 z-[100] flex max-w-[calc(100vw-24px)] flex-col gap-3 sm:right-4 sm:top-4">
        <WelcomeToast />
        <DeliveryOrderAlert />
        <TakeawayOrderAlert />
        <LowStockAlert />
        <EventAlert />
      </div>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 shrink-0 flex-col border-r border-qahwa-border bg-qahwa-panel px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0A0A0A]">
            <Image
              src="/logo-white.png"
              alt="Qahwa"
              width={26}
              height={26}
              className="object-contain"
              priority
            />
          </div>

          <span className="font-display text-sm uppercase tracking-wide text-qahwa-text">
            QAHWA
          </span>
        </div>

        <div className="min-h-0 flex-1">
          <SidebarNav />
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-qahwa-border bg-qahwa-panel px-4 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0A0A0A]">
            <Image
              src="/logo-white.png"
              alt="Qahwa"
              width={26}
              height={26}
              className="object-contain"
              priority
            />
          </div>

          <span className="font-display text-sm uppercase tracking-wide text-qahwa-text">
            QAHWA
          </span>
        </div>

        <div className="flex items-center">
          <SidebarNav />
        </div>
      </header>

      <main className="min-w-0 md:ml-56">
        <div className="p-4 pb-24 sm:p-5 sm:pb-24 md:p-6 md:pb-6">
          {children}
        </div>
      </main>
    </div>
  );
}