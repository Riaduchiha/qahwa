import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  const manifest = {
    id: "/caisse",
    name: "Caisse QAHWA",
    short_name: "Caisse",
    description: "Caisse et encaissement du café QAHWA.",
    lang: "fr",
    dir: "ltr",
    start_url: "/caisse",
    scope: "/caisse",
    display: "standalone",
    orientation: "any",
    background_color: "#0A0A0A",
    theme_color: "#0A0A0A",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json" },
  });
}