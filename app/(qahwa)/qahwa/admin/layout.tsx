import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QAHWA Admin",
  manifest: "/qahwa/admin/manifest.webmanifest",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}