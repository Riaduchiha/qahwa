import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QAHWA Admin",
  description: "Gestion administrative QAHWA",
  manifest: "/qahwa/admin/manifest.webmanifest",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}