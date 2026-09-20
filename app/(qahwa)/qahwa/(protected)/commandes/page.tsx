"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  Order,
  OrderItem,
  OrderStatus,
  OrderType,
} from "@/types/database";

function formatPrice(price: number) {
  return `${price} DA`;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  recue: "Recue",
  preparation: "En preparation",
  prete: "Prete",
  servi: "Servi",
  livraison: "En livraison",
  livree: "Livree",
  refusee: "Refusee",
  annulee: "Annulee",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  recue: "border-qahwa-orange/50 bg-qahwa-orange/15 text-qahwa-orange",
  preparation: "border-blue-500/40 bg-blue-500/15 text-blue-300",
  prete: "border-qahwa-green/40 bg-qahwa-green/15 text-qahwa-green",
  servi: "border-cyan-400/40 bg-cyan-400/15 text-cyan-300",
  livraison: "border-purple-500/40 bg-purple-500/15 text-purple-300",
  livree: "border-qahwa-border bg-qahwa-panel2 text-qahwa-muted",
  refusee: "border-qahwa-rouge/40 bg-qahwa-rouge/15 text-qahwa-rouge",
  annulee: "border-qahwa-rouge/40 bg-qahwa-rouge/15 text-qahwa-rouge",
};

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  livraison: "Livraison",
  emporter: "A emporter",
  sur_place: "Sur place",
};

const FILTERS: { value: OrderStatus | "toutes"; label: string }[] = [
  { value: "toutes", label: "Toutes" },
  { value: "recue", label: "Nouvelles" },
  { value: "preparation", label: "En preparation" },
  { value: "prete", label: "Pretes" },
  { value: "livraison", label: "En livraison" },
  { value: "servi", label: "Servi" },
  { value: "livree", label: "Livrees" },
  { value: "annulee", label: "Annulees" },
];

const CANCEL_REASONS = [
  "Erreur de saisie",
  "Client a annule",
  "Commande en double",
  "Rupture de stock",
  "Autre",
];

function nextStatus(order: Order): OrderStatus | null {
  if (order.status === "recue") return "preparation";
  if (order.status === "preparation") return "prete";
  if (order.status === "prete") {
    if (order.order_type === "sur_place") return "servi";
    if (order.order_type === "livraison") return "livraison";
    return null; // emporter : la commande reste "prete" jusqu'a recuperation, pas de flux livraison
  }
  if (order.status === "livraison") return "livree";
  return null;
}

type OrderWithItems = Order & { order_items: OrderItem[] };

export default function CommandesPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "toutes">("toutes");
   const [typeFilter, setTypeFilter] = useState<OrderType | "tous">("tous");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelCustomReason, setCancelCustomReason] = useState("");
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  async function loadOrders() {
    const { data: allOrders } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<Order[]>();

    if (!allOrders) return;

    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .in(
        "order_id",
        allOrders.map((o) => o.id)
      )
      .returns<OrderItem[]>();

    setOrders(
      allOrders.map((order) => ({
        ...order,
        order_items: (items ?? []).filter((i) => i.order_id === order.id),
      }))
    );
  }

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel("commandes-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateStatus(orderId: string, status: OrderStatus) {
    await supabase.from("orders").update({ status }).eq("id", orderId);
  }

  async function markPaid(orderId: string) {
    const res = await fetch("/api/poste/table-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, action: "paid" }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      alert("Erreur : " + error);
    }
  }
  function openCancelModal(orderId: string) {
    setCancelOrderId(orderId);
    setCancelReason(CANCEL_REASONS[0]);
    setCancelCustomReason("");
  }

  function closeCancelModal() {
    setCancelOrderId(null);
  }

  async function confirmCancel() {
    if (!cancelOrderId) return;
    const reason =
      cancelReason === "Autre" && cancelCustomReason.trim()
        ? cancelCustomReason.trim()
        : cancelReason;

    await supabase
      .from("orders")
      .update({ status: "annulee", cancel_reason: reason })
      .eq("id", cancelOrderId);

    closeCancelModal();
  }

  const filteredOrders = orders
    .filter((o) => filter === "toutes" || o.status === filter)
    .filter((o) => typeFilter === "tous" || o.order_type === typeFilter);

  return (
    <div>
      <h1 className="font-display text-2xl uppercase text-qahwa-text">
        Commandes
      </h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-display uppercase shadow-panel ${
              filter === f.value
                ? "border-qahwa-orange bg-qahwa-orange text-qahwa-noir"
                : "border-qahwa-border bg-qahwa-panel2 text-qahwa-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {(
          [
            { value: "tous", label: "Tous types" },
            { value: "sur_place", label: "Sur place" },
            { value: "emporter", label: "A emporter" },
            { value: "livraison", label: "Livraison" },
          ] as { value: OrderType | "tous"; label: string }[]
        ).map((t) => (
          <button
            key={t.value}
            onClick={() => setTypeFilter(t.value)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-display uppercase shadow-panel ${
              typeFilter === t.value
                ? "border-blue-400 bg-blue-400/20 text-blue-300"
                : "border-qahwa-border bg-qahwa-panel2 text-qahwa-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {filteredOrders.length === 0 && (
          <p className="text-sm text-qahwa-muted">Aucune commande.</p>
        )}

        {filteredOrders.map((order) => {
          const isOpen = expanded === order.id;
          const next = nextStatus(order);
          const isTableOrder = order.order_type === "sur_place";
          const isFinal =
            order.status === "livree" ||
            order.status === "refusee" ||
            order.status === "annulee" ||
            (order.order_type === "emporter" && order.status === "prete" && order.paid);

          return (
            <div
              key={order.id}
              className="rounded-xl border border-qahwa-border bg-qahwa-panel p-4 shadow-panel"
            >
              <div
                className="flex cursor-pointer items-center justify-between gap-3"
                onClick={() => setExpanded(isOpen ? null : order.id)}
              >
                <div>
                  <span className="font-display text-qahwa-text">
                    {order.order_number}
                  </span>
                  <span className="ml-2 text-sm text-qahwa-muted">
                    {order.customer_name} - {ORDER_TYPE_LABELS[order.order_type]}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-display ${STATUS_COLORS[order.status]}`}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                  <span className="font-display text-qahwa-text">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>

              {isOpen && (
                <div className="mt-4 space-y-3 border-t border-qahwa-border pt-4 text-sm">
                  <p className="text-qahwa-muted">
                    Telephone : {order.customer_phone}
                  </p>
                  {order.order_type === "livraison" && (
                    <p className="text-qahwa-muted">
                      {order.delivery_address}, {order.delivery_commune}
                      {order.delivery_notes ? ` - ${order.delivery_notes}` : ""}
                    </p>
                  )}
                  {order.order_type === "emporter" && order.pickup_time && (
                    <p className="text-qahwa-muted">
                      Heure souhaitee : {order.pickup_time}
                    </p>
                  )}
                  {order.order_type === "sur_place" && order.table_number && (
                    <p className="text-qahwa-muted">
                      Table {order.table_number}
                    </p>
                  )}
                  {order.status === "annulee" && order.cancel_reason && (
                    <p className="rounded-lg border border-qahwa-rouge/40 bg-qahwa-rouge/10 p-2 text-qahwa-rouge">
                      Motif d&apos;annulation : {order.cancel_reason}
                    </p>
                  )}

                  <ul className="space-y-1 text-qahwa-text">
                    {order.order_items.map((item) => (
                      <li key={item.id} className="flex justify-between">
                        <span>
                          {item.quantity} x {item.product_name}
                        </span>
                        <span>{formatPrice(item.line_total)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {!isTableOrder && order.status === "recue" && (
                      <>
                        <button
                          onClick={() => updateStatus(order.id, "preparation")}
                          className="rounded-lg border border-qahwa-green bg-qahwa-green/20 px-4 py-2 text-xs font-display uppercase text-qahwa-green shadow-panel"
                        >
                          Accepter
                        </button>
                        <button
                          onClick={() => updateStatus(order.id, "refusee")}
                          className="rounded-lg border border-qahwa-rouge bg-qahwa-rouge/20 px-4 py-2 text-xs font-display uppercase text-qahwa-rouge shadow-panel"
                        >
                          Refuser
                        </button>
                      </>
                    )}
                    {!isTableOrder && next && order.status !== "recue" && (
                      <button
                        onClick={() => updateStatus(order.id, next)}
                        className="rounded-lg border border-qahwa-orange bg-qahwa-orange px-4 py-2 text-xs font-display uppercase text-qahwa-noir shadow-panel"
                      >
                        Marquer &quot;{STATUS_LABELS[next]}&quot;
                      </button>
                    )}
                    {order.order_type === "emporter" &&
                      order.status === "prete" &&
                      !order.paid && (
                        <button
                          onClick={() => markPaid(order.id)}
                          className="rounded-lg border border-qahwa-green bg-qahwa-green/20 px-4 py-2 text-xs font-display uppercase text-qahwa-green shadow-panel"
                        >
                          Encaisser
                        </button>
                      )}
                    {order.order_type === "emporter" &&
                      order.status === "prete" &&
                      order.paid && (
                        <span className="rounded-lg border border-qahwa-green/40 bg-qahwa-green/10 px-4 py-2 text-xs font-display uppercase text-qahwa-green">
                          Encaissee - recuperee
                        </span>
                      )}
                    {!isFinal && (
                      <button
                        onClick={() => openCancelModal(order.id)}
                        className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-4 py-2 text-xs font-display uppercase text-qahwa-muted shadow-panel hover:border-qahwa-rouge hover:text-qahwa-rouge"
                      >
                        Supprimer la commande
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {cancelOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-qahwa-border bg-qahwa-panel p-5 shadow-panel">
            <h2 className="font-display text-lg uppercase text-qahwa-text">
              Supprimer la commande
            </h2>
            <p className="mt-1 text-sm text-qahwa-muted">
              Choisis le motif. Le proprietaire pourra voir cette suppression
              dans le filtre &quot;Annulees&quot;.
            </p>

            <div className="mt-4 space-y-2">
              {CANCEL_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setCancelReason(r)}
                  className={`block w-full rounded-lg border px-3 py-2 text-left text-sm font-display ${
                    cancelReason === r
                      ? "border-qahwa-orange bg-qahwa-orange/15 text-qahwa-text"
                      : "border-qahwa-border bg-qahwa-panel2 text-qahwa-muted"
                  }`}
                >
                  {r}
                </button>
              ))}
              {cancelReason === "Autre" && (
                <input
                  value={cancelCustomReason}
                  onChange={(e) => setCancelCustomReason(e.target.value)}
                  placeholder="Precise le motif"
                  className="w-full rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-2 text-sm text-qahwa-text placeholder:text-qahwa-muted"
                />
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={closeCancelModal}
                className="flex-1 rounded-xl border border-qahwa-border bg-qahwa-panel2 py-2.5 font-display uppercase text-qahwa-text"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                className="flex-1 rounded-xl border border-qahwa-rouge bg-qahwa-rouge/20 py-2.5 font-display uppercase text-qahwa-rouge"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
