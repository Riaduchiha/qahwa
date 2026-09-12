"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import LogoutButton from "@/components/qahwa/LogoutButton";

const NAV_ITEMS = [
  { href: "/qahwa", label: "Dashboard" },
  { href: "/qahwa/commandes", label: "Commandes" },
  { href: "/qahwa/menu", label: "Menu" },
  { href: "/qahwa/stock", label: "Stock" },
  { href: "/qahwa/evenements", label: "Calendrier" },
  { href: "/qahwa/tables", label: "Tables" },
  { href: "/qahwa/play", label: "PLAY" },
  { href: "/qahwa/statistiques", label: "Statistiques" },
  { href: "/qahwa/parametres", label: "Parametres" },
];

export default function SidebarNav() {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        className="mb-2 self-end rounded-md border border-qahwa-border bg-qahwa-panel2 px-2 py-1 text-xs text-qahwa-muted md:hidden"
      >
        {open ? "<" : ">"}
      </button>

      <div className={open ? "block" : "hidden md:block"}>
        <nav className="flex flex-col gap-0.5 text-sm">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 font-body transition ${
                  active
                    ? "bg-qahwa-panel2 text-qahwa-orange"
                    : "text-qahwa-muted hover:bg-qahwa-panel2 hover:text-qahwa-text"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 border-t border-qahwa-border pt-4">
          <LogoutButton />
        </div>
      </div>
    </>
  );
}