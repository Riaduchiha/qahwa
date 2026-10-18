import type { CafeTable, Order } from "@/types/database";
import {
  ACTIVE_STATUSES,
  FINISHED_STATUSES,
  type OrderFilter,
} from "./constants";

export type TableState = "libre" | "occupee" | "prete" | "servie" | "reservee";

export const isActive = (order: Order) => ACTIVE_STATUSES.includes(order.status);

export const isExternal = (order: Order) =>
  order.order_type === "livraison" || order.order_type === "emporter";

export const isPendingExternal = (order: Order) =>
  isExternal(order) && order.status === "recue";

export const isOpenTableOrder = (order: Order) =>
  order.order_type === "sur_place" && !order.paid && isActive(order);

export const isFinished = (order: Order) =>
  FINISHED_STATUSES.includes(order.status);

export function findTableOrder(orders: Order[], table: CafeTable) {
  return (
    orders.find(
      (order) =>
        isOpenTableOrder(order) && order.table_number === String(table.number)
    ) ?? null
  );
}

export function getTableState(
  table: CafeTable,
  order: Order | null
): TableState {
  if (order?.status === "prete") return "prete";
  if (order?.status === "servi") return "servie";
  if (order) return "occupee";
  if (table.reserved) return "reservee";
  return "libre";
}

export function getMergeableOrders(orders: Order[], current: Order) {
  return orders.filter(
    (order) =>
      order.id !== current.id &&
      isOpenTableOrder(order) &&
      Boolean(order.table_number) &&
      order.table_number !== current.table_number
  );
}

export function getFreeTables(
  tables: CafeTable[],
  orders: Order[],
  current: Order,
  currentTableId: string | null
) {
  return tables.filter(
    (table) =>
      table.is_active &&
      table.id !== currentTableId &&
      !table.reserved &&
      !orders.some(
        (order) =>
          order.id !== current.id &&
          isOpenTableOrder(order) &&
          order.table_number === String(table.number)
      )
  );
}

export function filterOrders(
  orders: Order[],
  filter: OrderFilter,
  search: string
) {
  const query = search.trim().toLowerCase();

  return orders.filter((order) => {
    const haystack =
      `${order.order_number} ${order.customer_name} ${order.customer_phone} ${order.table_number ?? ""}`.toLowerCase();
    if (query && !haystack.includes(query)) return false;

    switch (filter) {
      case "actives":
        return isActive(order);
      case "a_confirmer":
        return order.status === "recue";
      case "terminees":
        return isFinished(order);
      default:
        return true;
    }
  });
}

export function orderTypeLabel(order: Order) {
  if (order.order_type === "sur_place") {
    return `Table ${order.table_number ?? "—"}`;
  }
  return order.order_type === "livraison" ? "Livraison" : "À emporter";
}
