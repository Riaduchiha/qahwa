import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AudioUnlock from "@/components/qahwa/AudioUnlock";
import DeliveryOrderAlert from "@/components/qahwa/DeliveryOrderAlert";
import TakeawayOrderAlert from "@/components/qahwa/TakeawayOrderAlert";
import { CaisseServiceWorker } from "@/components/caisse/caisse-service-worker";

export const metadata: Metadata = {
  title: { absolute: "Caisse QAHWA" },
  manifest: "/api/caisse-manifest",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Caisse QAHWA",
    statusBarStyle: "black-translucent",
  },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
};

export default async function CaisseLayout({
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
      <CaisseServiceWorker />

      <div className="fixed right-3 top-3 z-[100] flex max-w-[calc(100vw-24px)] flex-col gap-3 sm:right-4 sm:top-4">
        <DeliveryOrderAlert />
        <TakeawayOrderAlert />
      </div>

      <main className="min-w-0 p-4 sm:p-5 md:p-6">{children}</main>
    </div>
  );
}