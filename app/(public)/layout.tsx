import Link from "next/link";
import Image from "next/image";
import CartBadge from "@/components/public/CartBadge";

// Header noir + bordure orange, calé sur les specs d'Imad (26/08).
const NAV_ITEMS = [
  { href: "/menu", label: "Menu" },
  { href: "/play", label: "Play" },
  { href: "/story", label: "Story" },
  { href: "/univers", label: "Univers" },
];

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-qahwa-creme">
      <header className="sticky top-0 z-40 border-b-4 border-qahwa-orange bg-qahwa-noir px-5 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" aria-label="Accueil Qahwa" className="flex items-center gap-2">
            <Image
              src="/logo-white.png"
              alt="Qahwa"
              width={36}
              height={36}
              className="qahwa-logo-breathe"
            />
            <span className="hidden font-display text-lg tracking-wide text-qahwa-blanc sm:inline">
              QAHWA
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-sm font-display text-qahwa-blanc">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-qahwa-orange-vif"
              >
                {item.label}
              </Link>
            ))}
            <CartBadge />
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
