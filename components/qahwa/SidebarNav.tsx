"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import LogoutButton from "@/components/qahwa/LogoutButton";

const NAV_ITEMS = [
  {
    href: "/qahwa",
    label: "Dashboard",
    icon: "⌂",
  },
  {
    href: "/qahwa/commandes",
    label: "Commandes",
    icon: "▤",
  },
  {
    href: "/qahwa/menu",
    label: "Menu",
    icon: "☕",
  },
  {
    href: "/qahwa/stock",
    label: "Stock",
    icon: "▣",
  },
  {
    href: "/qahwa/evenements",
    label: "Calendrier",
    icon: "▦",
  },
  {
    href: "/qahwa/tables",
    label: "Tables",
    icon: "♧",
  },
  {
    href: "/qahwa/employes",
    label: "Employe",
    icon: "♙",
  },
  {
    href: "/qahwa/play",
    label: "PLAY",
    icon: "▷",
  },
  {
    href: "/qahwa/statistiques",
    label: "Statistiques",
    icon: "◒",
  },
  {
    href: "/qahwa/parametres",
    label: "Parametres",
    icon: "⚙",
  },
];

export default function SidebarNav() {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();

  return (
    <>
      {/* Bouton mobile */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        className="mb-2 self-end rounded-md border border-qahwa-border bg-qahwa-panel2 px-2 py-1 text-xs text-qahwa-muted md:hidden"
      >
        {open ? "<" : ">"}
      </button>

      <div className={open ? "block" : "hidden md:block"}>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 font-body transition-all duration-200 ${
                  active
                    ? "bg-qahwa-panel2 text-qahwa-orange"
                    : "text-qahwa-muted hover:bg-qahwa-panel2 hover:text-qahwa-text"
                }`}
              >
                {/* Icône */}
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md text-base transition-all ${
                    active
                      ? "bg-qahwa-orange/10 text-qahwa-orange"
                      : "text-qahwa-muted group-hover:text-qahwa-text"
                  }`}
                >
                  {item.icon}
                </span>

                {/* Texte */}
                <span className="text-sm">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Déconnexion */}
        <div className="mt-6 border-t border-qahwa-border pt-4">
          <LogoutButton />
        </div>
      </div>
    </>
  );
}