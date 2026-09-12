import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Order } from "@/types/database";
import PendingOrders from "@/components/qahwa/PendingOrders";

function formatPrice(price: number) {
  return `${price} DA`;
}

async function getStats() {
  const supabase = createSupabaseServerClient();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { data: todayOrders } = await supabase
    .from("orders")
    .select("*")
    .gte("created_at", startOfToday.toISOString())
    .returns<Order[]>();

  const orders = todayOrders ?? [];

  const pending = orders.filter((o) => o.status === "recue").length;
  const preparation = orders.filter((o) => o.status === "preparation").length;
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);

  return {
    todayCount: orders.length,
    pending,
    preparation,
    revenue,
  };
}

export default async function QahwaDashboardPage() {
  const stats = await getStats();

  const cards = [
    { label: "Commandes du jour", value: stats.todayCount },
    { label: "En attente", value: stats.pending },
    { label: "En preparation", value: stats.preparation },
    { label: "Chiffre d'affaires (jour)", value: formatPrice(stats.revenue) },
  ];

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
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-qahwa-border bg-qahwa-panel p-4 shadow-panel"
          >
            <p className="text-xs uppercase text-qahwa-muted">
              {card.label}
            </p>
            <p className="mt-2 font-display text-2xl text-qahwa-text">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="font-display text-sm uppercase text-qahwa-muted">
          A valider
        </h2>
        <PendingOrders />
      </div>
    </div>
  );
}
