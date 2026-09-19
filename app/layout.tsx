import type { Metadata, Viewport } from "next";
import { Archivo_Black, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["italic"],
  variable: "--font-script",
});

export const metadata: Metadata = {
  title: "Qahwa",
  description: "Qahwa — coffeeshop à Hydra, Alger",
};

export const viewport: Viewport = {
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${archivoBlack.variable} ${inter.variable} ${playfair.variable}`}
    >
      <body className="font-body bg-qahwa-noir text-qahwa-blanc antialiased">
        {children}
      </body>
    </html>
  );
}