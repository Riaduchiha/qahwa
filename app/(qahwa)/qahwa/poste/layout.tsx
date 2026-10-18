import type { Metadata } from "next";
import NotificationProvider from "@/components/qahwa/NotificationProvider";

export const metadata: Metadata = {
  title: "QAHWA Poste",
  description: "Application du personnel QAHWA",
  manifest: "/qahwa/poste/manifest.webmanifest",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function PosteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NotificationProvider>{children}</NotificationProvider>;
}
