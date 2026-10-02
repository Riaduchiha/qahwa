import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    id: "/qahwa/poste",
    name: "QAHWA Poste",
    short_name: "QAHWA Poste",
    description: "Application du personnel QAHWA",
    start_url: "/qahwa/poste",
    scope: "/qahwa/poste",
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