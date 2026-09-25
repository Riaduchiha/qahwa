"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import LogoutButton from "@/components/qahwa/LogoutButton";

const NAV_ITEMS = [
  {
    href: "/qahwa",
    label: "Dashboard",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    href: "/qahwa/commandes",
    label: "Commandes",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <path d="M6 3h12v18H6z" />
        <path d="M9 7h6M9 11h6M9 15h4" />
      </svg>
    ),
  },
  {
    href: "/qahwa/menu",
    label: "Menu",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <path d="M7 3v8" />
        <path d="M4.5 3v5.5a2.5 2.5 0 0 0 5 0V3" />
        <path d="M7 11v10" />
        <path d="M16 3v18" />
        <path d="M16 3c2.2 0 3.5 1.8 3.5 4s-1.3 4-3.5 4" />
      </svg>
    ),
  },
  {
    href: "/qahwa/stock",
    label: "Stock",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" />
        <path d="m4 7.5 8 4.5 8-4.5" />
        <path d="M12 12v9" />
      </svg>
    ),
  },
  {
    href: "/qahwa/evenements",
    label: "Calendrier",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 10h18" />
        <path d="M8 14h2M14 14h2M8 17h2M14 17h2" />
      </svg>
    ),
  },
  {
    href: "/qahwa/tables",
    label: "Tables",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <path d="M4 10h16" />
        <path d="M5 10l1 8M19 10l-1 8M8 18h8" />
        <path d="M6 6h12a2 2 0 0 1 2 2v2H4V8a2 2 0 0 1 2-2Z" />
      </svg>
    ),
  },
  {
    href: "/qahwa/employes",
    label: "Employés",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 21c.6-4 3-6 7-6s6.4 2 7 6" />
      </svg>
    ),
  },
  {
    href: "/qahwa/play",
    label: "PLAY",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="m10 8 6 4-6 4z" />
      </svg>
    ),
  },
  {
    href: "/qahwa/statistiques",
    label: "Statistiques",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <path d="M4 20V10" />
        <path d="M10 20V5" />
        <path d="M16 20v-8" />
        <path d="M22 20H2" />
      </svg>
    ),
  },
  {
    href: "/qahwa/parametres",
    label: "Paramètres",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-full w-full"
      >
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
        <path d="m5.6 5.6 1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string) {
  return (
    pathname === href ||
    (href !== "/qahwa" && pathname.startsWith(`${href}/`))
  );
}

export default function SidebarNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const mobileMainItems = NAV_ITEMS.slice(0, 5);
  const mobileMoreItems = NAV_ITEMS.slice(5);

  return (
    <>
      {/* =========================
          DESKTOP SIDEBAR
          ========================= */}
      <div className="hidden h-full md:flex md:flex-col">
        <nav className="flex flex-col gap-1.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 transition-all duration-200 ${
                  active
                    ? "bg-qahwa-panel2 text-qahwa-orange shadow-[inset_0_0_0_1px_rgba(255,107,0,0.12)]"
                    : "text-qahwa-muted hover:bg-qahwa-panel2/80 hover:text-qahwa-text"
                }`}
              >
                <span
                  className={`absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-qahwa-orange transition-all duration-300 ${
                    active ? "w-0.5 opacity-100" : "w-0 opacity-0"
                  }`}
                />

                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
                    active
                      ? "bg-qahwa-orange/10 text-qahwa-orange"
                      : "text-qahwa-muted group-hover:bg-qahwa-panel2 group-hover:text-qahwa-orange"
                  }`}
                >
                  <span className="h-[19px] w-[19px] transition-transform duration-200 group-hover:scale-110">
                    {item.icon}
                  </span>
                </span>

                <span
                  className={`text-sm transition-transform duration-200 ${
                    active
                      ? "translate-x-0.5 font-medium"
                      : "group-hover:translate-x-0.5"
                  }`}
                >
                  {item.label}
                </span>

                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-qahwa-orange shadow-[0_0_8px_rgba(255,107,0,0.7)]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-qahwa-border/70 pt-4">
          <LogoutButton />
        </div>
      </div>

      {/* =========================
          MOBILE BOTTOM NAVIGATION
          ========================= */}
      <div className="fixed inset-x-0 bottom-0 z-[90] border-t border-qahwa-border bg-qahwa-panel px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.35)] md:hidden">
        <div className="relative mx-auto flex h-[72px] max-w-xl items-center justify-around">
          {mobileMainItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                  active
                    ? "text-qahwa-orange"
                    : "text-qahwa-muted hover:text-qahwa-text"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                    active
                      ? "bg-qahwa-orange/10 text-qahwa-orange"
                      : "text-qahwa-muted"
                  }`}
                >
                  <span className="h-[20px] w-[20px]">{item.icon}</span>
                </span>

                <span
                  className={`max-w-[64px] truncate text-[10px] leading-none ${
                    active ? "font-semibold" : ""
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* PLUS */}
          <button
            type="button"
            onClick={() => setMoreOpen((value) => !value)}
            className={`flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-colors ${
              moreOpen ||
              mobileMoreItems.some((item) => isActive(pathname, item.href))
                ? "text-qahwa-orange"
                : "text-qahwa-muted"
            }`}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                moreOpen ||
                mobileMoreItems.some((item) =>
                  isActive(pathname, item.href)
                )
                  ? "bg-qahwa-orange/10"
                  : ""
              }`}
            >
              <span className="text-xl leading-none">•••</span>
            </span>

            <span className="text-[10px] leading-none">Plus</span>
          </button>
        </div>

        {/* MENU PLUS */}
        {moreOpen && (
          <>
            <button
              type="button"
              aria-label="Fermer le menu"
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 -z-10 bg-black/30"
            />

            <div className="absolute bottom-[76px] right-2 w-56 overflow-hidden rounded-2xl border border-qahwa-border bg-qahwa-panel p-2 shadow-2xl">
              <div className="mb-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-qahwa-muted">
                Plus
              </div>

              <div className="flex flex-col gap-1">
                {mobileMoreItems.map((item) => {
                  const active = isActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${
                        active
                          ? "bg-qahwa-orange/10 text-qahwa-orange"
                          : "text-qahwa-muted hover:bg-qahwa-panel2 hover:text-qahwa-text"
                      }`}
                    >
                      <span className="h-5 w-5 shrink-0">{item.icon}</span>

                      <span className="text-sm">{item.label}</span>

                      {active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-qahwa-orange" />
                      )}
                    </Link>
                  );
                })}
              </div>

              <div className="mt-2 border-t border-qahwa-border pt-2">
                <LogoutButton />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}