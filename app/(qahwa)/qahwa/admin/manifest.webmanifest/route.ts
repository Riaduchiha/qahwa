import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    id: "/qahwa",
    name: "QAHWA",
    short_name: "QAHWA",
    description: "Application QAHWA",
    start_url: "/qahwa",
    scope: "/qahwa/",
    display: "standalone",
    background_color: "#0A0A0A",
    theme_color: "#0A0A0A",

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