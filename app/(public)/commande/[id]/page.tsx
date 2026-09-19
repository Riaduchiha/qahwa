import { notFound } from "next/navigation";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { Order, OrderItem, OrderStatus, OrderType } from "@/types/database";

export const dynamic = "force-dynamic";

function formatPrice(price: number) {
  return `${price} DA`;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  recue: "Commande reçue",
  preparation: "En préparation",
  prete: "Prête",
  servi: "Servie",
  livraison: "En livraison",
  livree: "Livrée",
  refusee: "Commande refusée",
  annulee: "Commande annulée",
};

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  livraison: "Livraison",
  emporter: "À emporter",
  sur_place: "Sur place",
};

async function getOrder(id: string) {
  const supabase = createSupabasePublicClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single<Order>();

  if (orderError || !order) return null;

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id)
    .returns<OrderItem[]>();

  return { order, items: items ?? [] };
}

export default async function OrderConfirmationPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getOrder(params.id);

  if (!data) notFound();

  const { order, items } = data;

  return (
    <section className="min-h-screen bg-qahwa-noir px-5 py-10">
      <p className="text-xs uppercase tracking-wide text-qahwa-blanc/50">
        Commande
      </p>
      <h1 className="font-display text-3xl uppercase text-qahwa-blanc">
        {order.order_number}
      </h1>

      <div className="mt-3 inline-block rounded-full border-2 border-qahwa-blanc bg-qahwa-orange px-4 py-1 font-display text-sm uppercase text-qahwa-noir shadow-brutal-sm">
        {STATUS_LABELS[order.status]}
      </div>

      <div className="mt-8 rounded-xl border-2 border-qahwa-blanc/20 bg-white/5 p-4 shadow-brutal-sm">
        <p className="font-display text-sm uppercase text-qahwa-blanc/70">
          {ORDER_TYPE_LABELS[order.order_type]}
        </p>
        <p className="mt-1 text-sm text-qahwa-blanc">{order.customer_name}</p>
        <p className="text-sm text-qahwa-blanc/60">{order.customer_phone}</p>

        {order.order_type === "livraison" && (
          <p className="mt-2 text-sm text-qahwa-blanc/60">
            {order.delivery_address}, {order.delivery_commune}
            {order.delivery_notes ? ` — ${order.delivery_notes}` : ""}
          </p>
        )}
        {order.order_type === "emporter" && order.pickup_time && (
          <p className="mt-2 text-sm text-qahwa-blanc/60">
            Heure souhaitée : {order.pickup_time}
          </p>
        )}
        {order.order_type === "sur_place" && order.table_number && (
          <p className="mt-2 text-sm text-qahwa-blanc/60">
            Table {order.table_number}
          </p>
        )}
      </div>

      <ul className="mt-6 space-y-2 rounded-xl border-2 border-qahwa-blanc/20 bg-white/5 p-4 shadow-brutal-sm">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex justify-between text-sm text-qahwa-blanc"
          >
            <span>
              {item.quantity} × {item.product_name}
            </span>
            <span>{formatPrice(item.line_total)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-1 rounded-xl border-2 border-qahwa-blanc/20 bg-white/5 p-4 text-sm shadow-brutal-sm">
        <div className="flex justify-between text-qahwa-blanc/70">
          <span>Sous-total</span>
          <span>{formatPrice(order.subtotal)}</span>
        </div>
        {order.delivery_fee > 0 && (
          <div className="flex justify-between text-qahwa-blanc/70">
            <span>Frais de livraison</span>
            <span>{formatPrice(order.delivery_fee)}</span>
          </div>
        )}
        <div className="flex justify-between border-t-2 border-qahwa-blanc/20 pt-2 font-display text-lg text-qahwa-blanc">
          <span>Total</span>
          <span className="text-qahwa-orange">
            {formatPrice(order.total)}
          </span>
        </div>
      </div>
    </section>
  );
}