import type { CafeTable } from "@/types/database";

export type ApiResult = { ok: true } | { ok: false; error: string };

async function request(
  url: string,
  method: "POST" | "PATCH",
  body: Record<string, unknown>,
  fallbackError: string
): Promise<ApiResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { ok: false, error: data.error ?? fallbackError };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Erreur réseau. Vérifie la connexion et réessaie.",
    };
  }
}

const tableAction = (body: Record<string, unknown>, fallback: string) =>
  request("/api/poste/tables-action", "POST", body, fallback);

const orderAction = (id: string, action: "accept" | "refuse", fallback: string) =>
  request("/api/poste/dashboard-orders", "PATCH", { id, action }, fallback);

/**
 * Toutes les routes API de la caisse au même endroit.
 * Les URL et les corps de requête sont identiques à l'ancienne version.
 */
export const caisseApi = {
  async fetchTables(): Promise<CafeTable[] | null> {
    try {
      const response = await fetch("/api/poste/tables-data", {
        cache: "no-store",
      });
      if (!response.ok) return null;
      const data = (await response.json()) as { tables?: CafeTable[] };
      return data.tables ?? [];
    } catch {
      return null;
    }
  },

  acceptOrder: (id: string) =>
    orderAction(id, "accept", "Confirmation impossible."),

  refuseOrder: (id: string) =>
    orderAction(id, "refuse", "Refus impossible."),

  setReserved: (tableId: string, reserved: boolean) =>
    tableAction(
      { action: "reserve", table_id: tableId, reserved },
      "Modification impossible."
    ),

  markServed: (orderId: string, tableId: string | null) =>
    tableAction(
      { order_id: orderId, table_id: tableId, action: "served" },
      "Action impossible."
    ),

  markPaid: (orderId: string, tableId: string | null) =>
    tableAction(
      { order_id: orderId, table_id: tableId, action: "paid" },
      "Encaissement impossible."
    ),

  changeTable: (orderId: string, tableId: string, targetTableId: string) =>
    tableAction(
      {
        order_id: orderId,
        table_id: tableId,
        target_table_id: targetTableId,
        action: "change_table",
      },
      "Déplacement impossible."
    ),

  mergePaid: (orderId: string, tableId: string, mergeOrderId: string) =>
    tableAction(
      {
        order_id: orderId,
        table_id: tableId,
        merge_order_id: mergeOrderId,
        action: "merge_paid",
      },
      "Fusion impossible."
    ),
};
