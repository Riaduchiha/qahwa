"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/qahwa/LogoutButton";

const NAV_ITEMS = [
  { href: "/qahwa/admin/dashboard", label: "Dashboard" },
  { href: "/qahwa/admin/commandes", label: "Commandes" },
  { href: "/qahwa/admin/menu", label: "Menu" },
  { href: "/qahwa/admin/stock", label: "Stock" },
  { href: "/qahwa/admin/evenements", label: "Calendrier" },
  { href: "/qahwa/admin/tables", label: "Tables" },
  { href: "/qahwa/admin/employes", label: "Employés" },
  { href: "/qahwa/admin/play", label: "PLAY" },
  { href: "/qahwa/admin/statistiques", label: "Statistiques" },
  { href: "/qahwa/admin/parametres", label: "Paramètres" },
];

export default function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <nav className="flex flex-col gap-1.5">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl px-3 py-2.5 text-sm transition ${
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

      <div className="mt-auto border-t border-qahwa-border/70 pt-4">
        <LogoutButton />
      </div>
    </div>
  );
}