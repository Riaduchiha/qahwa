
"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Period = "today" | "7days" | "month" | "year";

type Order = {
  id: string;
  total: number | null;
  status: string;
  paid: boolean;
  created_at: string;
  order_type: string;
};

type Expense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
};

type Purchase = {
  id: string;
  supplier_name: string;
  purchase_date: string;
  status: string;
};

type PurchaseItem = {
  purchase_id: string;
  line_total: number;
};

const PERIODS: { label: string; value: Period }[] = [
  { label: "Aujourd'hui", value: "today" },
  { label: "7 jours", value: "7days" },
  { label: "Ce mois", value: "month" },
  { label: "Cette année", value: "year" },
];

const money = (value: number) =>
  `${Math.round(value).toLocaleString("fr-FR")} DA`;

function getStartDate(period: Period) {
  const date = new Date();

  if (period === "today") {
    date.setHours(0, 0, 0, 0);
  } else if (period === "7days") {
    date.setDate(date.getDate() - 6);
    date.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
  } else {
    date.setMonth(0, 1);
    date.setHours(0, 0, 0, 0);
  }

  return date.toISOString();
}

function StatCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1B1B1B] p-5 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[#9A9A9A]">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFFFFF]/10 text-lg text-[#FFFFFF]">
          {icon}
        </span>
      </div>
      <p className="mt-4 break-words text-2xl font-semibold tracking-tight text-white">
        {value}
      </p>
      <p className="mt-2 text-xs text-[#888]">{description}</p>
    </div>
  );
}

export default function QahwaStatistiquesPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStatistics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = createSupabaseBrowserClient();
      const start = getStartDate(period);
      const startDate = start.slice(0, 10);

      const [
        ordersResult,
        expensesResult,
        purchasesResult,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("id,total,status,paid,created_at,order_type")
          .gte("created_at", start)
          .or("paid.eq.true,status.eq.livree")
          .not("status", "in", '("annulee","refusee")')
          .order("created_at", { ascending: false }),

        supabase
          .from("expenses")
          .select("id,title,category,amount,expense_date")
          .gte("expense_date", startDate)
          .order("expense_date", { ascending: false }),

        supabase
          .from("purchases")
          .select("id,supplier_name,purchase_date,status")
          .gte("purchase_date", startDate)
          .eq("status", "received")
          .order("purchase_date", { ascending: false }),
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (expensesResult.error) throw expensesResult.error;
      if (purchasesResult.error) throw purchasesResult.error;

      const loadedPurchases = (purchasesResult.data ?? []) as Purchase[];
      const purchaseIds = loadedPurchases.map((purchase) => purchase.id);

      let loadedItems: PurchaseItem[] = [];

      if (purchaseIds.length > 0) {
        const itemsResult = await supabase
          .from("purchase_items")
          .select("purchase_id,line_total")
          .in("purchase_id", purchaseIds);

        if (itemsResult.error) throw itemsResult.error;
        loadedItems = (itemsResult.data ?? []) as PurchaseItem[];
      }

      setOrders((ordersResult.data ?? []) as Order[]);
      setExpenses((expensesResult.data ?? []) as Expense[]);
      setPurchases(loadedPurchases);
      setPurchaseItems(loadedItems);
    } catch (err) {
      console.error("Erreur statistiques Qahwa :", err);
      setError(
        "Impossible de charger les statistiques. Vérifie ta connexion et les autorisations Supabase."
      );
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void loadStatistics();
  }, [loadStatistics]);

  const revenue = orders.reduce(
    (sum, order) => sum + Number(order.total ?? 0),
    0
  );

  const expensesTotal = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount ?? 0),
    0
  );

  const purchasesTotal = purchaseItems.reduce(
    (sum, item) => sum + Number(item.line_total ?? 0),
    0
  );

  const averageBasket = orders.length > 0 ? revenue / orders.length : 0;
  const estimatedBalance = revenue - expensesTotal - purchasesTotal;

  const orderTypes = [
    { label: "Sur place", value: "sur_place" },
    { label: "À emporter", value: "emporter" },
    { label: "Livraison", value: "livraison" },
  ].map((type) => {
    const matching = orders.filter((order) => order.order_type === type.value);
    return {
      ...type,
      count: matching.length,
      total: matching.reduce(
        (sum, order) => sum + Number(order.total ?? 0),
        0
      ),
    };
  });

  const expenseCategories = expenses.reduce<Record<string, number>>(
    (result, expense) => {
      result[expense.category] =
        (result[expense.category] ?? 0) + Number(expense.amount ?? 0);
      return result;
    },
    {}
  );

  const categoryLabels: Record<string, string> = {
    loyer: "Loyer",
    electricite: "Électricité",
    eau: "Eau",
    internet: "Internet",
    salaires: "Salaires",
    entretien: "Entretien",
    transport: "Transport",
    materiel: "Matériel",
    marketing: "Marketing",
    impots: "Impôts",
    frais_bancaires: "Frais bancaires",
    autre: "Autres",
  };

  const maxCategoryExpense = Math.max(
    1,
    ...Object.values(expenseCategories)
  );

  const dailySales = (() => {
    const days = period === "today" ? 12 : period === "7days" ? 7 : 10;
    const now = new Date();
    const result: { label: string; total: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);

      if (period === "today") {
        date.setHours(date.getHours() - i);
        const hour = date.getHours();
        result.push({
          label: `${String(hour).padStart(2, "0")}h`,
          total: orders
            .filter((order) => {
              const orderDate = new Date(order.created_at);
              return (
                orderDate.getFullYear() === date.getFullYear() &&
                orderDate.getMonth() === date.getMonth() &&
                orderDate.getDate() === date.getDate() &&
                orderDate.getHours() === hour
              );
            })
            .reduce((sum, order) => sum + Number(order.total ?? 0), 0),
        });
      } else {
        date.setDate(date.getDate() - i);
        const key = date.toDateString();
        result.push({
          label: date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
          total: orders
            .filter(
              (order) => new Date(order.created_at).toDateString() === key
            )
            .reduce((sum, order) => sum + Number(order.total ?? 0), 0),
        });
      }
    }

    return result;
  })();

  const maxDailySales = Math.max(1, ...dailySales.map((day) => day.total));

  return (
    <main className="min-w-0 space-y-6 pb-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        
<div className="min-w-0">
  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
    Pilotage du café
  </p>
  <h1 className="mt-2 text-2xl font-bold tracking-tight text-qahwa-text sm:text-3xl">
    Statistiques
  </h1>
  <p className="mt-2 text-sm text-white/50">
    Suis les ventes, les achats et les dépenses de Qahwa.
  </p>
</div>

        <button
          type="button"
          onClick={() => void loadStatistics()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#1B1B1B] px-4 py-3 text-sm text-white transition hover:border-[#FFFFFF]/50 disabled:opacity-50"
        >
          <span>{loading ? "Chargement..." : "↻ Actualiser"}</span>
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#151515] p-2">
        {PERIODS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setPeriod(item.value)}
            className={`rounded-xl px-4 py-2.5 text-sm transition ${
              period === item.value
                ? "bg-[#FFFFFF] font-semibold text-white"
                : "text-[#A0A0A0] hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#1B1B1B] p-10 text-center text-sm text-[#9A9A9A]">
          Chargement des données financières...
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Chiffre d'affaires"
              value={money(revenue)}
              description={`${orders.length} commande(s) payée(s) sur la période`}
              icon="↗"
            />
            <StatCard
              label="Dépenses enregistrées"
              value={money(expensesTotal)}
              description={`${expenses.length} dépense(s) enregistrée(s)`}
              icon="−"
            />
            <StatCard
              label="Achats fournisseurs"
              value={money(purchasesTotal)}
              description={`${purchases.length} achat(s) reçu(s)`}
              icon="▤"
            />
            <StatCard
              label="Panier moyen"
              value={money(averageBasket)}
              description="Chiffre d'affaires ÷ commandes payées"
              icon="◈"
            />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
            <div className="rounded-2xl border border-white/[0.08] bg-[#1B1B1B] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    Évolution des ventes
                  </h2>
                  <p className="mt-1 text-xs text-[#888]">
                    Chiffre d'affaires enregistré sur la période
                  </p>
                </div>
                <span className="rounded-lg bg-[#FFFFFF]/10 px-3 py-1.5 text-xs font-medium text-[#FFFFFF]">
                  {money(revenue)}
                </span>
              </div>

              <div className="mt-8 flex h-48 items-end gap-2 sm:gap-3">
                {dailySales.map((day, index) => (
                  <div
                    key={`${day.label}-${index}`}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                    title={`${day.label} : ${money(day.total)}`}
                  >
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-[#FFFFFF] to-[#FF9A4D] transition-all"
                        style={{
                          height: `${Math.max(
                            day.total > 0 ? 5 : 1,
                            (day.total / maxDailySales) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="truncate text-[10px] text-[#888] sm:text-xs">
                      {day.label}
                    </span>
                  </div>
                ))}
              </div>
              {revenue === 0 && (
                <p className="mt-4 text-center text-xs text-[#777]">
                  Les ventes apparaîtront ici lorsque des commandes payées seront enregistrées.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#1B1B1B] p-5 sm:p-6">
              <h2 className="text-base font-semibold text-white">
                Solde indicatif
              </h2>
              <p className="mt-1 text-xs text-[#888]">
                Ventes moins achats reçus et dépenses saisies
              </p>

              <p
                className={`mt-6 break-words text-3xl font-semibold ${
                  estimatedBalance >= 0 ? "text-[#FF8A36]" : "text-red-400"
                }`}
              >
                {money(estimatedBalance)}
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[#A0A0A0]">Ventes payées</span>
                  <span className="font-medium text-white">{money(revenue)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[#A0A0A0]">Achats reçus</span>
                  <span className="text-white">− {money(purchasesTotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[#A0A0A0]">Autres dépenses</span>
                  <span className="text-white">− {money(expensesTotal)}</span>
                </div>
                <div className="border-t border-white/10 pt-3 text-xs leading-5 text-[#777]">
                  Ce solde est indicatif, pas un bénéfice net comptable. Les achats correspondent aux marchandises reçues, pas nécessairement aux ingrédients consommés pendant cette période.
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-[#1B1B1B] p-5 sm:p-6">
              <h2 className="text-base font-semibold text-white">
                Ventes par type de commande
              </h2>
              <p className="mt-1 text-xs text-[#888]">
                Répartition des commandes payées
              </p>

              <div className="mt-6 space-y-5">
                {orderTypes.map((type) => (
                  <div key={type.value}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-[#D0D0D0]">{type.label}</span>
                      <span className="text-white">
                        {money(type.total)}{" "}
                        <span className="text-xs text-[#888]">
                          · {type.count}
                        </span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-[#FFFFFF]"
                        style={{
                          width: `${revenue > 0 ? Math.min(100, (type.total / revenue) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#1B1B1B] p-5 sm:p-6">
              <h2 className="text-base font-semibold text-white">
                Répartition des dépenses
              </h2>
              <p className="mt-1 text-xs text-[#888]">
                Par catégorie sur la période sélectionnée
              </p>

              {Object.keys(expenseCategories).length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-[#777]">
                  Aucune dépense enregistrée sur cette période.
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {Object.entries(expenseCategories)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, total]) => (
                      <div key={category}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                          <span className="text-[#D0D0D0]">
                            {categoryLabels[category] ?? category}
                          </span>
                          <span className="text-white">{money(total)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-[#FFFFFF]"
                            style={{
                              width: `${(total / maxCategoryExpense) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-[#1B1B1B] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Dernières dépenses
                </h2>
                <p className="mt-1 text-xs text-[#888]">
                  Les dernières charges enregistrées
                </p>
              </div>
              <span className="text-sm font-semibold text-white">
                {money(expensesTotal)}
              </span>
            </div>

            {expenses.length === 0 ? (
              <p className="mt-6 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-[#777]">
                Aucune dépense pour cette période. La future page de gestion permettra de les saisir.
              </p>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-[#888]">
                      <th className="pb-3 pr-4 font-medium">Dépense</th>
                      <th className="pb-3 pr-4 font-medium">Catégorie</th>
                      <th className="pb-3 pr-4 font-medium">Date</th>
                      <th className="pb-3 text-right font-medium">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.slice(0, 8).map((expense) => (
                      <tr key={expense.id} className="border-b border-white/[0.05] last:border-0">
                        <td className="py-4 pr-4 font-medium text-white">
                          {expense.title}
                        </td>
                        <td className="py-4 pr-4 text-[#AAA]">
                          {categoryLabels[expense.category] ?? expense.category}
                        </td>
                        <td className="py-4 pr-4 text-[#888]">
                          {new Date(`${expense.expense_date}T12:00:00`).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="py-4 text-right font-medium text-white">
                          {money(Number(expense.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
