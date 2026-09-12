"use server";

import { createClient } from "@supabase/supabase-js";
import type { Database, OrderType } from "@/types/database";
import type { CartItem } from "@/lib/store/cart";

// Client avec la clé anon (RLS autorise l'insertion publique de commandes,
// voir supabase/migrations/0002_orders.sql).
function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key"
  );
}

function generateOrderNumber() {
  // Ex: QH-7K2M9 — court, lisible, suffisant pour un premier numéro
  // de commande (pas de garantie cryptographique d'unicité, mais le
  // champ order_number est UNIQUE en base : une collision fait échouer
  // l'insertion, extrêmement rare sur ce format).
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `QH-${code}`;
}

export type CreateOrderInput = {
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  orderType: OrderType;
  deliveryCommune?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
  pickupTime?: string;
  tableNumber?: string;
};

export async function createOrder(
  input: CreateOrderInput
): Promise<{ orderId: string; orderNumber: string } | { error: string }> {
  if (input.items.length === 0) {
    return { error: "Le panier est vide." };
  }
  if (!input.customerName.trim() || !input.customerPhone.trim()) {
    return { error: "Nom et téléphone requis." };
  }

  const supabase = getSupabase();

  const subtotal = input.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const deliveryFee = input.orderType === "livraison" ? 200 : 0; // provisoire, configurable plus tard depuis QAHWA
  const total = subtotal + deliveryFee;

  const orderNumber = generateOrderNumber();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      customer_name: input.customerName.trim(),
      customer_phone: input.customerPhone.trim(),
      order_type: input.orderType,
      delivery_commune: input.deliveryCommune ?? null,
      delivery_address: input.deliveryAddress ?? null,
      delivery_notes: input.deliveryNotes ?? null,
      pickup_time: input.pickupTime ?? null,
      table_number: input.tableNumber ?? null,
      subtotal,
      delivery_fee: deliveryFee,
      total,
      status: "recue",
    })
    .select()
    .single();

  if (orderError || !order) {
    return { error: orderError?.message ?? "Erreur inconnue." };
  }

  const productIds = input.items
    .map((item) => item.productId)
    .filter(Boolean);

  const { data: products } = await supabase
    .from("products")
    .select("id, station")
    .in("id", productIds);

  const stationByProduct = new Map(
    (products ?? []).map((p) => [p.id, p.station])
  );

  const { error: itemsError } = await supabase.from("order_items").insert(
    input.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.name,
      unit_price: item.price,
      quantity: item.quantity,
      line_total: item.price * item.quantity,
      station: stationByProduct.get(item.productId) ?? "barista",
      status: "new",
    }))
  );

  if (itemsError) {
    return { error: itemsError.message };
  }

  return { orderId: order.id, orderNumber: order.order_number };
}
