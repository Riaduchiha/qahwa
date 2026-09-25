import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    id: "/qahwa/admin/",
    name: "QAHWA Admin",
    short_name: "QAHWA Admin",
    description: "Gestion administrative QAHWA",
    start_url: "/qahwa/admin/",
    scope: "/qahwa/admin/",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#111111",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  });
}