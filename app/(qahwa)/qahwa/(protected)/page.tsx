import Link from "next/link";
import PendingOrders from "@/components/qahwa/PendingOrders";
import StatsCards from "@/components/qahwa/StatsCards";

export default function QahwaDashboardPage() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl uppercase text-qahwa-text">
          Dashboard
        </h1>
        <div className="flex gap-2">
          <Link
            href="/qahwa/commandes"
            className="rounded-lg border border-qahwa-orange bg-qahwa-orange px-4 py-2 font-display text-sm uppercase text-qahwa-noir shadow-panel"
          >
            Voir les commandes
          </Link>
          <Link
            href="/qahwa/kds"
            className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-4 py-2 font-display text-sm uppercase text-qahwa-text shadow-panel hover:border-qahwa-orange"
          >
            Ouvrir Barista Display
          </Link>
        </div>
      </div>

      <StatsCards />

      <div className="mt-8">
        <h2 className="font-display text-sm uppercase text-qahwa-muted">
          A valider
        </h2>
        <PendingOrders />
      </div>
    </div>
  );
}