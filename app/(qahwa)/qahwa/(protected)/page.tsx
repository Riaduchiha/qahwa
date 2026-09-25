import Link from "next/link";
import PendingOrders from "@/components/qahwa/PendingOrders";
import StatsCards from "@/components/qahwa/StatsCards";

export default function QahwaDashboardPage() {
  return (
    <div className="min-h-full pb-10">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl border border-qahwa-border bg-qahwa-panel p-6 shadow-panel">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-qahwa-orange/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-qahwa-green" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-qahwa-muted">
                Système opérationnel
              </span>
            </div>

            <h1 className="font-display text-3xl uppercase tracking-tight text-qahwa-text md:text-4xl">
              Dashboard
            </h1>

            <p className="mt-2 max-w-xl text-sm text-qahwa-muted">
              Vue en direct de l'activité QAHWA.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/qahwa/commandes"
              className="group rounded-xl border border-qahwa-orange bg-qahwa-orange px-5 py-3 font-display text-xs uppercase tracking-wide text-qahwa-noir transition hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(255,107,0,0.22)]"
            >
              Voir les commandes
              <span className="ml-2 transition group-hover:translate-x-1">
                →
              </span>
            </Link>

            <Link
              href="/qahwa/kds"
              className="rounded-xl border border-qahwa-border bg-qahwa-panel2 px-5 py-3 font-display text-xs uppercase tracking-wide text-qahwa-text transition hover:border-qahwa-orange hover:bg-qahwa-orange/5"
            >
              Barista Display
            </Link>
          </div>
        </div>
      </div>

      {/* STATS */}
      <section className="mt-5">
        <StatsCards />
      </section>

      {/* LIVE AREA */}
      <section className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* COMMANDES */}
        <div className="overflow-hidden rounded-2xl border border-qahwa-border bg-qahwa-panel shadow-panel">
          <div className="flex items-center justify-between border-b border-qahwa-border px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-qahwa-orange" />
                <h2 className="font-display text-sm uppercase tracking-wide text-qahwa-text">
                  Commandes en direct
                </h2>
              </div>

              <p className="mt-1 text-xs text-qahwa-muted">
                Les nouvelles commandes apparaissent automatiquement.
              </p>
            </div>

            <Link
              href="/qahwa/commandes"
              className="text-xs font-semibold uppercase tracking-wide text-qahwa-orange transition hover:text-qahwa-text"
            >
              Tout voir →
            </Link>
          </div>

          <div className="p-4">
            <PendingOrders />
          </div>
        </div>

        {/* ACTIONS RAPIDES */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-qahwa-border bg-qahwa-panel p-5 shadow-panel">
            <div className="mb-4">
              <p className="font-display text-sm uppercase tracking-wide text-qahwa-text">
                Accès rapide
              </p>

              <p className="mt-1 text-xs text-qahwa-muted">
                Les espaces utilisés le plus souvent.
              </p>
            </div>

            <div className="space-y-2">
              <Link
                href="/qahwa/tables"
                className="group flex items-center justify-between rounded-xl border border-qahwa-border bg-qahwa-panel2 px-4 py-3 transition hover:border-qahwa-orange hover:bg-qahwa-orange/5"
              >
                <div>
                  <p className="text-sm font-semibold text-qahwa-text">
                    Tables
                  </p>
                  <p className="text-[11px] text-qahwa-muted">
                    Service et encaissement
                  </p>
                </div>

                <span className="text-lg text-qahwa-muted transition group-hover:translate-x-1 group-hover:text-qahwa-orange">
                  →
                </span>
              </Link>

              <Link
                href="/qahwa/menu"
                className="group flex items-center justify-between rounded-xl border border-qahwa-border bg-qahwa-panel2 px-4 py-3 transition hover:border-qahwa-orange hover:bg-qahwa-orange/5"
              >
                <div>
                  <p className="text-sm font-semibold text-qahwa-text">
                    Menu
                  </p>
                  <p className="text-[11px] text-qahwa-muted">
                    Produits et catégories
                  </p>
                </div>

                <span className="text-lg text-qahwa-muted transition group-hover:translate-x-1 group-hover:text-qahwa-orange">
                  →
                </span>
              </Link>

              <Link
                href="/qahwa/stock"
                className="group flex items-center justify-between rounded-xl border border-qahwa-border bg-qahwa-panel2 px-4 py-3 transition hover:border-qahwa-orange hover:bg-qahwa-orange/5"
              >
                <div>
                  <p className="text-sm font-semibold text-qahwa-text">
                    Stock
                  </p>
                  <p className="text-[11px] text-qahwa-muted">
                    Produits et inventaire
                  </p>
                </div>

                <span className="text-lg text-qahwa-muted transition group-hover:translate-x-1 group-hover:text-qahwa-orange">
                  →
                </span>
              </Link>
            </div>
          </div>

          {/* ETAT */}
          <div className="rounded-2xl border border-qahwa-border bg-qahwa-panel p-5 shadow-panel">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm uppercase tracking-wide text-qahwa-text">
                État du système
              </p>

              <span className="rounded-full border border-qahwa-green/30 bg-qahwa-green/10 px-2.5 py-1 text-[10px] font-bold uppercase text-qahwa-green">
                En ligne
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-qahwa-muted">Commandes</span>
                <span className="text-qahwa-green">● Actif</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-qahwa-muted">KDS</span>
                <span className="text-qahwa-green">● Actif</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-qahwa-muted">Tables</span>
                <span className="text-qahwa-green">● Actif</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER DASHBOARD */}
      <div className="mt-5 flex flex-col justify-between gap-2 border-t border-qahwa-border pt-4 text-[10px] uppercase tracking-[0.16em] text-qahwa-muted sm:flex-row">
        <span>QAHWA · Management System</span>
        <span>Live dashboard</span>
      </div>
    </div>
  );
}