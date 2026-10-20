"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { money } from "@/lib/caisse/format";

const SECTIONS = [
  { key: "stock", label: "Stock", src: "/qahwa/stock" },
  { key: "commandes", label: "Commandes", src: "/qahwa/commandes" },
  { key: "menu", label: "Gestion menu", src: "/qahwa/menu" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

type ShiftOrder = {
  id: string;
  status: string | null;
  total: number | null;
  paid: boolean | null;
  payment_method: string | null;
  order_type: string | null;
  cancel_reason: string | null;
};

type ShiftItem = { order_id: string; product_name: string; quantity: number };

type Row = { label: string; count: number; amount: number };

type Summary = {
  revenue: number;
  total: number;
  paid: number;
  pending: number;
  cancelled: number;
  average: number;
  byType: Row[];
  byPayment: Row[];
  topProducts: { name: string; quantity: number }[];
};

const CANCELLED_STATUSES = ["annulee", "annulée", "refusee", "refusée", "cancelled"];

const TYPE_LABELS: Record<string, string> = {
  sur_place: "Sur place",
  emporter: "À emporter",
  livraison: "Livraison",
};

function isCancelled(order: ShiftOrder) {
  return (
    CANCELLED_STATUSES.includes((order.status ?? "").toLowerCase()) ||
    !!order.cancel_reason
  );
}

function buildSummary(orders: ShiftOrder[], items: ShiftItem[]): Summary {
  const active = orders.filter((order) => !isCancelled(order));
  const paidOrders = active.filter((order) => order.paid);

  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);

  const typeMap = new Map<string, Row>();
  const paymentMap = new Map<string, Row>();

  for (const order of active) {
    const typeKey = order.order_type ?? "autre";
    const typeRow = typeMap.get(typeKey) ?? {
      label: TYPE_LABELS[typeKey] ?? typeKey,
      count: 0,
      amount: 0,
    };
    typeRow.count += 1;
    if (order.paid) typeRow.amount += Number(order.total ?? 0);
    typeMap.set(typeKey, typeRow);
  }

  for (const order of paidOrders) {
    const key = order.payment_method?.trim() || "Non précisé";
    const row = paymentMap.get(key) ?? { label: key, count: 0, amount: 0 };
    row.count += 1;
    row.amount += Number(order.total ?? 0);
    paymentMap.set(key, row);
  }

  const productMap = new Map<string, number>();
  for (const item of items) {
    productMap.set(
      item.product_name,
      (productMap.get(item.product_name) ?? 0) + Number(item.quantity ?? 0)
    );
  }

  return {
    revenue,
    total: orders.length,
    paid: paidOrders.length,
    pending: active.length - paidOrders.length,
    cancelled: orders.length - active.length,
    average: paidOrders.length > 0 ? Math.round(revenue / paidOrders.length) : 0,
    byType: Array.from(typeMap.values()),
    byPayment: Array.from(paymentMap.values()).sort((a, b) => b.amount - a.amount),
    topProducts: Array.from(productMap.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3),
  };
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-qahwa-border bg-qahwa-panel2 p-3">
      <p className="text-xs uppercase text-qahwa-muted">{label}</p>
      <p className="mt-1 font-display text-xl text-qahwa-text">{value}</p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-qahwa-border bg-qahwa-panel2 p-3">
      <h3 className="mb-2 font-display text-xs uppercase text-qahwa-muted">{title}</h3>
      {children}
    </div>
  );
}

export function CaisseToolbar() {
  const router = useRouter();
  const [open, setOpen] = useState<SectionKey | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const section = SECTIONS.find((item) => item.key === open) ?? null;

  useEffect(() => {
    if (!open && !summaryOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (summaryOpen) setSummaryOpen(false);
      else setOpen(null);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, summaryOpen]);

  async function openSummary() {
    setSummaryOpen(true);
    setSummaryLoading(true);
    setSummaryError(null);
    setSummary(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("orders")
        .select("id,status,total,paid,payment_method,order_type,cancel_reason")
        .gte("created_at", start.toISOString());

      if (error) throw error;

      const orders = (data ?? []) as unknown as ShiftOrder[];
      const validIds = orders.filter((order) => !isCancelled(order)).map((order) => order.id);

      let items: ShiftItem[] = [];
      if (validIds.length > 0) {
        const result = await supabase
          .from("order_items")
          .select("order_id,product_name,quantity")
          .in("order_id", validIds);

        if (result.error) throw result.error;
        items = (result.data ?? []) as unknown as ShiftItem[];
      }

      setSummary(buildSummary(orders, items));
    } catch {
      setSummaryError("Impossible de charger le résumé. Réessaie.");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        setSummaryError("La déconnexion a échoué. Réessaie.");
        setLoggingOut(false);
        return;
      }

      router.replace("/caisse/login");
      router.refresh();
    } catch {
      setSummaryError("Impossible de se déconnecter. Réessaie.");
      setLoggingOut(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Image
            src="/logo-white.png"
            alt="QAHWA"
            width={36}
            height={36}
            priority
            className="h-9 w-9 object-contain"
          />

          <h1 className="font-display text-3xl uppercase">
            Qahwa Caisse
          </h1>
        </div>

        <nav
          aria-label="Raccourcis de la caisse"
          className="flex flex-wrap gap-2"
        >
          {SECTIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setLoaded(false);
                setOpen(item.key);
              }}
              className="min-h-[44px] rounded-xl border border-qahwa-border bg-qahwa-panel2 px-4 font-display text-xs uppercase text-qahwa-text transition hover:border-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {item.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => void openSummary()}
            className="min-h-[44px] rounded-xl border border-qahwa-orange bg-qahwa-orange px-4 font-display text-xs uppercase text-black transition hover:bg-[#ff8126] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qahwa-orange"
          >
            Clôturer le shift
          </button>
        </nav>
      </div>

      {section && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={section.label}
          className="fixed inset-0 z-[80] flex flex-col bg-qahwa-bg"
        >
          <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-qahwa-border bg-qahwa-panel px-4">
            <h2 className="font-display text-lg uppercase text-qahwa-text">
              {section.label}
            </h2>

            <button
              type="button"
              onClick={() => setOpen(null)}
              className="min-h-[40px] rounded-lg border border-white bg-white px-4 font-display text-xs uppercase text-black transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Retour à la caisse
            </button>
          </div>

          <div className="relative min-h-0 flex-1">
            {!loaded && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-qahwa-muted">
                Chargement...
              </p>
            )}

            <iframe
              key={section.key}
              src={section.src}
              title={section.label}
              onLoad={() => setLoaded(true)}
              className="h-full w-full border-0"
            />
          </div>
        </div>
      )}

      {summaryOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Résumé de la journée"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
        >
          <div className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-qahwa-border bg-qahwa-panel shadow-2xl">
            <div className="shrink-0 border-b border-qahwa-border p-4">
              <h2 className="font-display text-xl uppercase text-qahwa-text">
                Résumé de la journée
              </h2>
              <p className="text-xs text-qahwa-muted">
                {new Date().toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {summaryLoading && (
                <p className="py-10 text-center text-sm text-qahwa-muted">Chargement...</p>
              )}

              {summaryError && (
                <p role="alert" className="rounded-xl border border-qahwa-rouge/60 p-3 text-sm text-qahwa-rouge">
                  {summaryError}
                </p>
              )}

              {summary && (
                <>
                  <div className="rounded-xl border border-qahwa-orange/60 bg-qahwa-orange/10 p-4 text-center">
                    <p className="text-xs uppercase text-qahwa-muted">Chiffre d'affaires encaissé</p>
                    <p className="mt-1 font-display text-3xl text-qahwa-orange">
                      {money(summary.revenue)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <Stat label="Commandes" value={summary.total} />
                    <Stat label="Payées" value={summary.paid} />
                    <Stat label="En cours" value={summary.pending} />
                    <Stat label="Annulées" value={summary.cancelled} />
                    <Stat label="Ticket moyen" value={money(summary.average)} />
                  </div>

                  <Block title="Par type de commande">
                    {summary.byType.length === 0 ? (
                      <p className="text-sm text-qahwa-muted">Aucune commande.</p>
                    ) : (
                      summary.byType.map((row) => (
                        <div key={row.label} className="flex justify-between py-1 text-sm text-qahwa-text">
                          <span>{row.label} ({row.count})</span>
                          <span>{money(row.amount)}</span>
                        </div>
                      ))
                    )}
                  </Block>

                  <Block title="Caisse par mode de paiement">
                    {summary.byPayment.length === 0 ? (
                      <p className="text-sm text-qahwa-muted">Aucun encaissement.</p>
                    ) : (
                      summary.byPayment.map((row) => {
                        const cash = /esp|cash/i.test(row.label);
                        return (
                          <div
                            key={row.label}
                            className={`flex justify-between py-1 text-sm ${
                              cash ? "font-bold text-qahwa-orange" : "text-qahwa-text"
                            }`}
                          >
                            <span>
                              {row.label} ({row.count})
                              {cash ? " · en caisse" : ""}
                            </span>
                            <span>{money(row.amount)}</span>
                          </div>
                        );
                      })
                    )}
                  </Block>

                  <Block title="Top 3 produits">
                    {summary.topProducts.length === 0 ? (
                      <p className="text-sm text-qahwa-muted">Aucune vente.</p>
                    ) : (
                      summary.topProducts.map((product, index) => (
                        <div key={product.name} className="flex justify-between py-1 text-sm text-qahwa-text">
                          <span>{index + 1}. {product.name}</span>
                          <span>× {product.quantity}</span>
                        </div>
                      ))
                    )}
                  </Block>
                </>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-2 border-t border-qahwa-border p-4 sm:flex-row">
              <button
                type="button"
                onClick={() => setSummaryOpen(false)}
                disabled={loggingOut}
                className="min-h-[44px] flex-1 rounded-xl border border-white bg-white px-4 font-display text-xs uppercase text-black transition hover:bg-white/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Rester sur la caisse
              </button>

              <button
                type="button"
                onClick={() => void logout()}
                disabled={loggingOut}
                className="min-h-[44px] flex-1 rounded-xl border border-qahwa-orange bg-qahwa-orange px-4 font-display text-xs uppercase text-black transition hover:bg-[#ff8126] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qahwa-orange"
              >
                {loggingOut ? "Déconnexion..." : "Se déconnecter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}