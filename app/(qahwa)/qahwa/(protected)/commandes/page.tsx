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
  preparation: "En préparation",
  prete: "Prête",
  servi: "Servie",
  livraison: "En livraison",
  livree: "Livrée",
  refusee: "Refusée",
  annulee: "Annulée",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  recue:
    "border-qahwa-orange/40 bg-qahwa-orange/10 text-qahwa-orange",
  preparation:
    "border-blue-400/30 bg-blue-400/10 text-blue-300",
  prete:
    "border-qahwa-green/30 bg-qahwa-green/10 text-qahwa-green",
  servi:
    "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  livraison:
    "border-purple-400/30 bg-purple-400/10 text-purple-300",
  livree:
    "border-qahwa-border bg-qahwa-panel2 text-qahwa-muted",
  refusee:
    "border-qahwa-rouge/30 bg-qahwa-rouge/10 text-qahwa-rouge",
  annulee:
    "border-qahwa-rouge/30 bg-qahwa-rouge/10 text-qahwa-rouge",
};

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  livraison: "Livraison",
  emporter: "À emporter",
  sur_place: "Sur place",
};

const ORDER_TYPE_ICONS: Record<OrderType, string> = {
  livraison: "↗",
  emporter: "▣",
  sur_place: "⌂",
};

const FILTERS: { value: OrderStatus | "toutes"; label: string }[] = [
  { value: "toutes", label: "Toutes" },
  { value: "recue", label: "Nouvelles" },
  { value: "preparation", label: "Préparation" },
  { value: "prete", label: "Prêtes" },
  { value: "livraison", label: "Livraison" },
  { value: "servi", label: "Servies" },
  { value: "livree", label: "Livrées" },
  { value: "annulee", label: "Annulées" },
];

const CANCEL_REASONS = [
  "Erreur de saisie",
  "Client a annulé",
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

    return null;
  }

  if (order.status === "livraison") return "livree";

  return null;
}

type OrderWithItems = Order & {
  order_items: OrderItem[];
};

export default function CommandesPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [filter, setFilter] =
    useState<OrderStatus | "toutes">("toutes");
  const [typeFilter, setTypeFilter] =
    useState<OrderType | "tous">("tous");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [cancelOrderId, setCancelOrderId] =
    useState<string | null>(null);

  const [cancelReason, setCancelReason] =
    useState(CANCEL_REASONS[0]);

  const [cancelCustomReason, setCancelCustomReason] =
    useState("");

  const supabase = useMemo(
    () => createSupabaseBrowserClient(),
    []
  );

  async function loadOrders() {
    const { data: allOrders } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<Order[]>();

    if (!allOrders) return;

    const orderIds = allOrders.map((order) => order.id);

    if (orderIds.length === 0) {
      setOrders([]);
      return;
    }

    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", orderIds)
      .returns<OrderItem[]>();

    setOrders(
      allOrders.map((order) => ({
        ...order,
        order_items: (items ?? []).filter(
          (item) => item.order_id === order.id
        ),
      }))
    );
  }

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel("commandes-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => loadOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateStatus(
    orderId: string,
    status: OrderStatus
  ) {
    await supabase
      .from("orders")
      .update({ status } as never)
      .eq("id", orderId);
  }

  async function markPaid(orderId: string) {
    const res = await fetch("/api/poste/tables-action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_id: orderId,
        action: "paid",
      }),
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
      cancelReason === "Autre" &&
      cancelCustomReason.trim()
        ? cancelCustomReason.trim()
        : cancelReason;

    await supabase
      .from("orders")
      .update({
        status: "annulee",
        cancel_reason: reason,
      } as never)
      .eq("id", cancelOrderId);

    closeCancelModal();
  }

  const filteredOrders = orders
    .filter(
      (order) =>
        filter === "toutes" || order.status === filter
    )
    .filter(
      (order) =>
        typeFilter === "tous" ||
        order.order_type === typeFilter
    );

  const countForStatus = (status: OrderStatus) =>
    orders.filter((order) => order.status === status).length;

  return (
    <div className="w-full">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-[10px] uppercase tracking-[0.25em] text-qahwa-orange">
            Gestion
          </p>

          <h1 className="mt-1 font-display text-2xl uppercase tracking-tight text-qahwa-text sm:text-3xl">
            Commandes
          </h1>

          <p className="mt-1 text-xs text-qahwa-muted sm:text-sm">
            Suivi et gestion des commandes en temps réel
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-xl border border-qahwa-border bg-qahwa-panel px-3 py-2 sm:self-auto">
          <span className="h-2 w-2 rounded-full bg-qahwa-green shadow-[0_0_8px_rgba(12,253,108,0.7)]" />
          <span className="text-xs text-qahwa-muted">
            {filteredOrders.length} commande
            {filteredOrders.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* STATUS FILTERS */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-display text-[10px] uppercase tracking-wider text-qahwa-muted">
            Statut
          </span>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 scrollbar-none">
          {FILTERS.map((item) => {
            const active = filter === item.value;

            const count =
              item.value === "toutes"
                ? orders.length
                : countForStatus(item.value);

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-display uppercase transition-all ${
                  active
                    ? "border-qahwa-orange bg-qahwa-orange text-qahwa-noir shadow-[0_4px_15px_rgba(255,107,0,0.15)]"
                    : "border-qahwa-border bg-qahwa-panel text-qahwa-muted hover:border-qahwa-orange/40 hover:text-qahwa-text"
                }`}
              >
                <span>{item.label}</span>

                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                    active
                      ? "bg-black/15 text-qahwa-noir"
                      : "bg-qahwa-panel2 text-qahwa-muted"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TYPE FILTERS */}
      <div className="mt-1">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-display text-[10px] uppercase tracking-wider text-qahwa-muted">
            Type de commande
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              {
                value: "tous",
                label: "Tous",
              },
              {
                value: "sur_place",
                label: "Sur place",
              },
              {
                value: "emporter",
                label: "À emporter",
              },
              {
                value: "livraison",
                label: "Livraison",
              },
            ] as {
              value: OrderType | "tous";
              label: string;
            }[]
          ).map((item) => {
            const active = typeFilter === item.value;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setTypeFilter(item.value)}
                className={`rounded-lg border px-3 py-2 text-[11px] font-display uppercase transition-all ${
                  active
                    ? "border-blue-400/50 bg-blue-400/10 text-blue-300"
                    : "border-qahwa-border bg-qahwa-panel text-qahwa-muted hover:border-qahwa-border hover:text-qahwa-text"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* COMMANDES */}
      <div className="mt-6 space-y-3">
        {filteredOrders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-qahwa-border bg-qahwa-panel/60 px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-qahwa-panel2 text-xl text-qahwa-muted">
              —
            </div>

            <p className="mt-4 font-display text-sm uppercase text-qahwa-text">
              Aucune commande
            </p>

            <p className="mt-1 text-xs text-qahwa-muted">
              Les commandes correspondant aux filtres apparaîtront ici.
            </p>
          </div>
        )}

        {filteredOrders.map((order) => {
          const isOpen = expanded === order.id;
          const next = nextStatus(order);
          const isTableOrder = order.order_type === "sur_place";

          const isFinal =
            order.status === "livree" ||
            order.status === "refusee" ||
            order.status === "annulee" ||
            (order.order_type === "emporter" &&
              order.status === "prete" &&
              order.paid);

          return (
            <div
              key={order.id}
              className={`overflow-hidden rounded-2xl border bg-qahwa-panel transition-all ${
                isOpen
                  ? "border-qahwa-orange/30 shadow-[0_8px_30px_rgba(0,0,0,0.18)]"
                  : "border-qahwa-border hover:border-qahwa-border/80"
              }`}
            >
              {/* ORDER HEADER */}
              <button
                type="button"
                onClick={() =>
                  setExpanded(isOpen ? null : order.id)
                }
                className="w-full text-left"
              >
                <div className="flex items-center gap-3 p-4 sm:p-5">
                  {/* ORDER NUMBER */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-qahwa-panel2 font-display text-xs text-qahwa-orange">
                    #
                  </div>

                  {/* MAIN INFO */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-display text-sm text-qahwa-text sm:text-base">
                        {order.order_number}
                      </span>

                      <span className="text-qahwa-border">
                        •
                      </span>

                      <span className="truncate text-xs text-qahwa-muted sm:text-sm">
                        {order.customer_name}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-qahwa-muted sm:text-xs">
                      <span>
                        {ORDER_TYPE_ICONS[order.order_type]}
                      </span>

                      <span>
                        {ORDER_TYPE_LABELS[order.order_type]}
                      </span>

                      {order.order_type === "sur_place" &&
                        order.table_number && (
                          <>
                            <span>•</span>
                            <span>
                              Table {order.table_number}
                            </span>
                          </>
                        )}
                    </div>
                  </div>

                  {/* RIGHT INFO */}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="font-display text-sm text-qahwa-text sm:text-base">
                      {formatPrice(order.total)}
                    </span>

                    <span
                      className={`rounded-lg border px-2 py-1 text-[9px] font-display uppercase sm:px-2.5 sm:text-[10px] ${STATUS_COLORS[order.status]}`}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                </div>
              </button>

              {/* DETAILS */}
              {isOpen && (
                <div className="border-t border-qahwa-border bg-qahwa-bg/40 p-4 sm:p-5">
                  <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
                    {/* CUSTOMER INFO */}
                    <div className="rounded-xl border border-qahwa-border bg-qahwa-panel p-4">
                      <p className="font-display text-[10px] uppercase tracking-wider text-qahwa-muted">
                        Informations
                      </p>

                      <div className="mt-3 space-y-3">
                        <div>
                          <p className="text-[10px] uppercase text-qahwa-muted">
                            Client
                          </p>
                          <p className="mt-0.5 text-sm text-qahwa-text">
                            {order.customer_name}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase text-qahwa-muted">
                            Téléphone
                          </p>
                          <p className="mt-0.5 text-sm text-qahwa-text">
                            {order.customer_phone}
                          </p>
                        </div>

                        {order.order_type === "livraison" && (
                          <div>
                            <p className="text-[10px] uppercase text-qahwa-muted">
                              Livraison
                            </p>

                            <p className="mt-0.5 text-sm leading-5 text-qahwa-text">
                              {order.delivery_address},{" "}
                              {order.delivery_commune}
                            </p>

                            {order.delivery_notes && (
                              <p className="mt-1 text-xs text-qahwa-muted">
                                {order.delivery_notes}
                              </p>
                            )}
                          </div>
                        )}

                        {order.order_type === "emporter" &&
                          order.pickup_time && (
                            <div>
                              <p className="text-[10px] uppercase text-qahwa-muted">
                                Heure souhaitée
                              </p>

                              <p className="mt-0.5 text-sm text-qahwa-text">
                                {order.pickup_time}
                              </p>
                            </div>
                          )}

                        {order.order_type === "sur_place" &&
                          order.table_number && (
                            <div>
                              <p className="text-[10px] uppercase text-qahwa-muted">
                                Table
                              </p>

                              <p className="mt-0.5 font-display text-sm text-qahwa-text">
                                Table {order.table_number}
                              </p>
                            </div>
                          )}

                        {order.status === "annulee" &&
                          order.cancel_reason && (
                            <div className="rounded-xl border border-qahwa-rouge/30 bg-qahwa-rouge/10 p-3">
                              <p className="text-[10px] uppercase text-qahwa-rouge">
                                Motif d&apos;annulation
                              </p>

                              <p className="mt-1 text-xs text-qahwa-rouge">
                                {order.cancel_reason}
                              </p>
                            </div>
                          )}
                      </div>
                    </div>

                    {/* ARTICLES */}
                    <div className="rounded-xl border border-qahwa-border bg-qahwa-panel p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-display text-[10px] uppercase tracking-wider text-qahwa-muted">
                          Articles
                        </p>

                        <span className="text-[10px] text-qahwa-muted">
                          {order.order_items.length} article
                          {order.order_items.length !== 1
                            ? "s"
                            : ""}
                        </span>
                      </div>

                      <div className="mt-3 divide-y divide-qahwa-border">
                        {order.order_items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-qahwa-panel2 font-display text-xs text-qahwa-orange">
                                {item.quantity}
                              </span>

                              <span className="min-w-0 truncate text-sm text-qahwa-text">
                                {item.product_name}
                              </span>
                            </div>

                            <span className="shrink-0 text-xs text-qahwa-muted">
                              {formatPrice(item.line_total)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-qahwa-border pt-3">
                        <span className="font-display text-xs uppercase text-qahwa-muted">
                          Total
                        </span>

                        <span className="font-display text-lg text-qahwa-text">
                          {formatPrice(order.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {!isTableOrder &&
                      order.status === "recue" && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              updateStatus(
                                order.id,
                                "preparation"
                              )
                            }
                            className="min-h-11 rounded-xl border border-qahwa-green/50 bg-qahwa-green/10 px-5 py-2.5 font-display text-xs uppercase text-qahwa-green transition hover:bg-qahwa-green/20"
                          >
                            Accepter la commande
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateStatus(
                                order.id,
                                "refusee"
                              )
                            }
                            className="min-h-11 rounded-xl border border-qahwa-rouge/40 bg-qahwa-rouge/10 px-5 py-2.5 font-display text-xs uppercase text-qahwa-rouge transition hover:bg-qahwa-rouge/20"
                          >
                            Refuser
                          </button>
                        </>
                      )}

                    {!isTableOrder &&
                      next &&
                      order.status !== "recue" && (
                        <button
                          type="button"
                          onClick={() =>
                            updateStatus(order.id, next)
                          }
                          className="min-h-11 rounded-xl border border-qahwa-orange bg-qahwa-orange px-5 py-2.5 font-display text-xs uppercase text-qahwa-noir transition hover:bg-qahwa-orange-vif"
                        >
                          Marquer « {STATUS_LABELS[next]} »
                        </button>
                      )}

                    {order.order_type === "emporter" &&
                      order.status === "prete" &&
                      !order.paid && (
                        <button
                          type="button"
                          onClick={() =>
                            markPaid(order.id)
                          }
                          className="min-h-11 rounded-xl border border-qahwa-green/50 bg-qahwa-green/10 px-5 py-2.5 font-display text-xs uppercase text-qahwa-green transition hover:bg-qahwa-green/20"
                        >
                          Encaisser
                        </button>
                      )}

                    {order.order_type === "emporter" &&
                      order.status === "prete" &&
                      order.paid && (
                        <span className="flex min-h-11 items-center rounded-xl border border-qahwa-green/30 bg-qahwa-green/10 px-5 py-2.5 font-display text-xs uppercase text-qahwa-green">
                          Encaissée · récupérée
                        </span>
                      )}

                    {!isFinal && (
                      <button
                        type="button"
                        onClick={() =>
                          openCancelModal(order.id)
                        }
                        className="min-h-11 rounded-xl border border-qahwa-border bg-qahwa-panel2 px-5 py-2.5 font-display text-xs uppercase text-qahwa-muted transition hover:border-qahwa-rouge/50 hover:text-qahwa-rouge"
                      >
                        Annuler la commande
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CANCEL MODAL */}
      {cancelOrderId && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-2xl border border-qahwa-border bg-qahwa-panel p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-[10px] uppercase tracking-[0.2em] text-qahwa-orange">
                  Commande
                </p>

                <h2 className="mt-1 font-display text-lg uppercase text-qahwa-text">
                  Annuler la commande
                </h2>

                <p className="mt-1 text-xs leading-5 text-qahwa-muted">
                  Choisis le motif de l&apos;annulation.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCancelModal}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-qahwa-panel2 text-qahwa-muted hover:text-qahwa-text"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-2">
              {CANCEL_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() =>
                    setCancelReason(reason)
                  }
                  className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition ${
                    cancelReason === reason
                      ? "border-qahwa-orange/50 bg-qahwa-orange/10 text-qahwa-text"
                      : "border-qahwa-border bg-qahwa-panel2 text-qahwa-muted hover:text-qahwa-text"
                  }`}
                >
                  {reason}
                </button>
              ))}

              {cancelReason === "Autre" && (
                <input
                  value={cancelCustomReason}
                  onChange={(event) =>
                    setCancelCustomReason(
                      event.target.value
                    )
                  }
                  placeholder="Précise le motif"
                  className="mt-2 w-full rounded-xl border border-qahwa-border bg-qahwa-panel2 px-3 py-3 text-sm text-qahwa-text outline-none placeholder:text-qahwa-muted focus:border-qahwa-orange"
                />
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={closeCancelModal}
                className="min-h-11 flex-1 rounded-xl border border-qahwa-border bg-qahwa-panel2 px-4 font-display text-xs uppercase text-qahwa-text"
              >
                Retour
              </button>

              <button
                type="button"
                onClick={confirmCancel}
                className="min-h-11 flex-1 rounded-xl border border-qahwa-rouge/50 bg-qahwa-rouge/10 px-4 font-display text-xs uppercase text-qahwa-rouge"
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