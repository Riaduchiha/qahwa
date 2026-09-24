"use server";

import { randomBytes, randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database, OrderType } from "@/types/database";
import type { CartItem } from "@/lib/store/cart";

function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key"
  );
}

function generateOrderNumber() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return "QH-" + code;
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
): Promise<
  | {
      orderId: string;
      orderNumber: string;
      confirmationToken: string;
    }
  | { error: string }
> {
  if (input.items.length === 0) {
    return { error: "Le panier est vide." };
  }

  if (!input.customerName.trim() || !input.customerPhone.trim()) {
    return { error: "Nom et téléphone requis." };
  }

  if (
    input.orderType !== "livraison" &&
    input.orderType !== "emporter" &&
    input.orderType !== "sur_place"
  ) {
    return { error: "Type de commande invalide." };
  }

  const supabase = getSupabase();

  const productIds = input.items
    .map((item) => item.productId)
    .filter(Boolean);

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, price, station, is_available")
    .in("id", productIds);

  if (productsError || !products) {
    return { error: "Impossible de vérifier les produits." };
  }

  const productById = new Map(products.map((p) => [p.id, p]));

  for (const item of input.items) {
    const product = productById.get(item.productId);

    if (!product) {
      return { error: `Produit introuvable : ${item.name}` };
    }

    if (!product.is_available) {
      return { error: `Produit indisponible : ${product.name}` };
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { error: `Quantité invalide pour : ${product.name}` };
    }
  }

  const subtotal = input.items.reduce((sum, item) => {
    const product = productById.get(item.productId)!;
    return sum + product.price * item.quantity;
  }, 0);

  const deliveryFee = input.orderType === "livraison" ? 200 : 0;
  const total = subtotal + deliveryFee;

  const orderId = randomUUID();
  const orderNumber = generateOrderNumber();
  const confirmationToken = randomBytes(32).toString("hex");

  const { error: orderError } = await supabase
    .from("orders")
    .insert({
      id: orderId,
      order_number: orderNumber,
      confirmation_token: confirmationToken,
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
    });

  if (orderError) {
    return { error: orderError.message };
  }

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(
      input.items.map((item) => {
        const product = productById.get(item.productId)!;

        return {
          order_id: orderId,
          product_id: item.productId,
          product_name: product.name,
          unit_price: product.price,
          quantity: item.quantity,
          line_total: product.price * item.quantity,
          station: product.station ?? "barista",
          status: "new",
        };
      })
    );

  if (itemsError) {
    return { error: itemsError.message };
  }

  try {
    const { data: recipeLines } = await supabase
      .from("product_ingredients")
      .select("product_id, ingredient_id, quantity_used")
      .in("product_id", productIds);

    if (recipeLines && recipeLines.length > 0) {
      const quantityByProduct = new Map(
        input.items.map((item) => [item.productId, item.quantity])
      );

      const deductionByIngredient = new Map<string, number>();

      for (const line of recipeLines) {
        const orderedQty = quantityByProduct.get(line.product_id) ?? 0;

        if (orderedQty <= 0) continue;

        const toDeduct = line.quantity_used * orderedQty;

        deductionByIngredient.set(
          line.ingredient_id,
          (deductionByIngredient.get(line.ingredient_id) ?? 0) + toDeduct
        );
      }

      const ingredientIds = [...deductionByIngredient.keys()];

      if (ingredientIds.length > 0) {
        const { data: currentIngredients } = await supabase
          .from("ingredients")
          .select("id, quantity_in_stock")
          .in("id", ingredientIds);

        for (const ing of currentIngredients ?? []) {
          const toDeduct = deductionByIngredient.get(ing.id) ?? 0;

          const newQuantity = Math.max(
            0,
            ing.quantity_in_stock - toDeduct
          );

          await supabase
            .from("ingredients")
            .update({ quantity_in_stock: newQuantity })
            .eq("id", ing.id);
        }
      }
    }
  } catch {
    // La déduction de stock ne doit jamais faire échouer la commande.
  }

  return {
    orderId,
    orderNumber,
    confirmationToken,
  };
}