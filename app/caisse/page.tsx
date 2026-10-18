"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createOrder } from "@/app/(public)/commander/actions";
import type { CafeTable, Order } from "@/types/database";
import { caisseApi, type ApiResult } from "@/lib/caisse/api";
import { MAX_TABLES } from "@/lib/caisse/constants";
import { money } from "@/lib/caisse/format";
import { printTicket } from "@/lib/caisse/print-ticket";
import {
  findTableOrder,
  getFreeTables,
  getMergeableOrders,
} from "@/lib/caisse/selectors";
import { playAlertSound, playCashSound } from "@/lib/caisse/sound";
import { useCaisseData } from "@/lib/caisse/use-caisse-data";
import { useCart } from "@/lib/caisse/use-cart";
import { useMenu } from "@/lib/caisse/use-menu";
import { useOrderItems } from "@/lib/caisse/use-order-items";
import { CaisseToolbar } from "@/components/caisse/caisse-toolbar";
import { ConfirmDialog, type Confirmation } from "@/components/caisse/confirm-dialog";
import { FloorPlan } from "@/components/caisse/floor-plan";
import { NewOrderPanel } from "@/components/caisse/new-order-panel";
import { PaymentPanel } from "@/components/caisse/payment-panel";
import { ChangeTableDialog, MergeDialog } from "@/components/caisse/table-dialogs";
import { surface } from "@/components/caisse/ui";

type Notice = { message: string; type: "success" | "error" | "info" };

const NOTICE_BORDER = {
  success: "border-qahwa-green/60",
  error: "border-qahwa-rouge/60",
  info: "border-qahwa-orange/60",
};
const NOTICE_ICON = {
  success: "bg-qahwa-green/15 text-qahwa-green",
  error: "bg-qahwa-rouge/15 text-qahwa-rouge",
  info: "bg-qahwa-orange/15 text-qahwa-orange",
};
const NOTICE_MARK = { success: "✓", error: "!", info: "i" };

export default function CaissePage() {
  const { supabase, tables, orders, reload } = useCaisseData(() => {});
  const menu = useMenu(supabase);
  const cart = useCart();

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [takeaway, setTakeaway] = useState(false);
  const [dialog, setDialog] = useState<"change" | "merge" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const readyIds = useRef<Set<string>>(new Set());
  const readyInitialized = useRef(false);

  // Son + message quand une commande devient "prête à servir".
  useEffect(() => {
    const ready = orders.filter((item) => item.status === "prete" && !item.paid);
    const current = new Set(ready.map((item) => item.id));

    if (readyInitialized.current) {
      const fresh = ready.filter((item) => !readyIds.current.has(item.id));
      if (fresh.length > 0) {
        audioRef.current?.play().catch(() => playAlertSound());
        const numbers = fresh.map((item) => item.table_number).filter(Boolean);
        setNotice({
          message: numbers.length
            ? `Commande prête à servir : table ${numbers.join(", ")}.`
            : "Une commande est prête à servir.",
          type: "info",
        });
      }
    }

    readyIds.current = current;
    if (orders.length > 0) readyInitialized.current = true;
  }, [orders]);

  useEffect(() => {
    if (notice?.type !== "success") return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const displayedTables = useMemo(
    () =>
      tables
        .filter((table) => table.is_active)
        .sort((a, b) => Number(a.number) - Number(b.number))
        .slice(0, MAX_TABLES),
    [tables]
  );

  const selectedTable = tables.find((table) => table.id === selectedTableId) ?? null;
  const order = orders.find((item) => item.id === selectedOrderId) ?? null;
  const orderItems = useOrderItems(supabase, order?.id ?? null);

  function closePanel() {
    setSelectedTableId(null);
    setSelectedOrderId(null);
    setTakeaway(false);
    setDialog(null);
    cart.clear();
  }

  function selectTable(table: CafeTable) {
    const current = findTableOrder(orders, table);
    cart.clear();
    setDialog(null);
    setTakeaway(false);
    setSelectedTableId(table.id);
    setSelectedOrderId(current?.id ?? null);
    if (!current) void menu.load();
  }

  function startTakeaway() {
    cart.clear();
    setDialog(null);
    setSelectedTableId(null);
    setSelectedOrderId(null);
    setTakeaway(true);
    void menu.load();
  }

  async function toggleReserved(table: CafeTable) {
    const result = await caisseApi.setReserved(table.id, !table.reserved);

    if (!result.ok) {
      setNotice({ message: result.error, type: "error" });
      return;
    }

    await reload();
    setNotice({
      message: table.reserved
        ? `Réservation de la table ${table.number} annulée.`
        : `Table ${table.number} réservée.`,
      type: "success",
    });
  }

  async function createTableOrder(customerName: string, customerPhone: string) {
    if (!selectedTable || submitting) return;

    if (cart.items.length === 0) {
      setNotice({ message: "Ajoute au moins un produit.", type: "error" });
      return;
    }

    setSubmitting(true);

    try {
      const result = await createOrder({
        items: cart.items,
        customerName: customerName.trim() || "Client comptoir",
        customerPhone: customerPhone.trim() || "-",
        orderType: "sur_place",
        tableNumber: String(selectedTable.number),
      });

      if ("error" in result) {
        setNotice({ message: result.error, type: "error" });
        return;
      }

      await reload();
      closePanel();
      setNotice({
        message: `Commande créée pour la table ${selectedTable.number}.`,
        type: "success",
      });
    } catch {
      setNotice({ message: "Impossible de créer la commande. Réessaie.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function createTakeawayOrder(customerName: string, customerPhone: string) {
    if (submitting) return;

    if (cart.items.length === 0) {
      setNotice({ message: "Ajoute au moins un produit.", type: "error" });
      return;
    }

    setSubmitting(true);

    try {
      const result = await createOrder({
        items: cart.items,
        customerName: customerName.trim() || "Client à emporter",
        customerPhone: customerPhone.trim() || "-",
        orderType: "emporter",
      } as Parameters<typeof createOrder>[0]);

      if ("error" in result) {
        setNotice({ message: result.error, type: "error" });
        return;
      }

      // Commande prise à la caisse : on la confirme tout de suite si on connaît son identifiant.
      const created = result as unknown as {
        id?: string;
        orderId?: string;
        order?: { id?: string };
      };
      const newId = created.id ?? created.orderId ?? created.order?.id;
      if (newId) await caisseApi.acceptOrder(newId);

      await reload();
      closePanel();
      setNotice({ message: "Commande à emporter créée.", type: "success" });
    } catch {
      setNotice({ message: "Impossible de créer la commande. Réessaie.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  /** Lance une action, puis rafraîchit et prévient. */
  async function perform(
    run: () => Promise<ApiResult>,
    successMessage: string,
    options: { cash?: boolean; keepOpen?: boolean } = {}
  ) {
    setBusy(true);
    const result = await run();
    setBusy(false);
    setConfirmation(null);

    if (!result.ok) {
      setNotice({ message: result.error, type: "error" });
      return;
    }

    if (options.cash) playCashSound();
    if (!options.keepOpen) closePanel();
    await reload();
    setNotice({ message: successMessage, type: "success" });
  }

  function payCurrent() {
    if (!order || !selectedTable) return;
    const current = order;
    const tableId = selectedTable.id;
    setConfirmation({
      message: `Encaisser ${money(current.total)} pour la table ${selectedTable.number} ?`,
      label: "Encaisser",
      action: () =>
        perform(() => caisseApi.markPaid(current.id, tableId), "Encaissement effectué.", {
          cash: true,
        }),
    });
  }

  function serveCurrent() {
    if (!order || !selectedTable) return;
    const current = order;
    const tableId = selectedTable.id;
    setConfirmation({
      message: `Marquer la commande ${current.order_number} comme servie ?`,
      label: "Marquer servie",
      action: () =>
        perform(() => caisseApi.markServed(current.id, tableId), "Commande marquée comme servie.", {
          keepOpen: true,
        }),
    });
  }

  function changeTable(targetId: string) {
    if (!order || !selectedTable) return;
    const target = tables.find((table) => table.id === targetId);
    if (!target) return;
    const current = order;
    const from = selectedTable;

    setConfirmation({
      message: `Déplacer la commande ${current.order_number} de la table ${from.number} vers la table ${target.number} ?`,
      label: "Déplacer",
      action: () =>
        perform(
          () => caisseApi.changeTable(current.id, from.id, target.id),
          `Commande déplacée vers la table ${target.number}.`
        ),
    });
  }

  function mergePayment(second: Order) {
    if (!order || !selectedTable) return;
    const first = order;
    const from = selectedTable;
    const combined = Number(first.total) + Number(second.total);

    setConfirmation({
      message:
        `Table ${first.table_number} : ${money(first.total)}\n` +
        `Table ${second.table_number} : ${money(second.total)}\n\n` +
        `Total à encaisser : ${money(combined)}\n\n` +
        `Les deux commandes seront payées et les deux tables libérées.`,
      label: "Encaisser les deux",
      action: () =>
        perform(
          () => caisseApi.mergePaid(first.id, from.id, second.id),
          `Encaissement groupé terminé : ${money(combined)}.`,
          { cash: true }
        ),
    });
  }

  function printCurrent() {
    if (!order) return;
    if (!printTicket(order, orderItems.items)) {
      setNotice({
        message: "Autorise les fenêtres pop-up pour imprimer le ticket.",
        type: "error",
      });
    }
  }

  return (
    <div className="min-w-0 space-y-4 text-white">
      <audio ref={audioRef} src="/ready-notification.mp3" preload="auto" />

      {notice && (
        <div className="fixed right-4 top-4 z-[70] w-[calc(100%-2rem)] max-w-sm">
          <div
            role={notice.type === "error" ? "alert" : "status"}
            className={`flex items-start gap-3 rounded-xl border bg-qahwa-panel p-4 shadow-2xl ${NOTICE_BORDER[notice.type]}`}
          >
            <span
              aria-hidden
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold ${NOTICE_ICON[notice.type]}`}
            >
              {NOTICE_MARK[notice.type]}
            </span>
            <p className="flex-1 pt-1 text-sm leading-relaxed text-qahwa-text">{notice.message}</p>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Fermer la notification"
              className="shrink-0 px-1 text-qahwa-muted hover:text-qahwa-orange"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {confirmation && (
        <ConfirmDialog
          confirmation={confirmation}
          busy={busy}
          onCancel={() => setConfirmation(null)}
        />
      )}

      {dialog === "change" && order && selectedTable && (
        <ChangeTableDialog
          tables={getFreeTables(tables, orders, order, selectedTable.id)}
          order={order}
          fromTableNumber={selectedTable.number}
          busy={busy}
          onConfirm={changeTable}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog === "merge" && order && selectedTable && (
        <MergeDialog
          current={order}
          candidates={getMergeableOrders(orders, order)}
          busy={busy}
          onConfirm={mergePayment}
          onClose={() => setDialog(null)}
        />
      )}

      <CaisseToolbar />

      <div className="grid min-w-0 items-stretch gap-4 xl:grid-cols-[440px_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <button
            type="button"
            onClick={startTakeaway}
            aria-pressed={takeaway}
            className={`min-h-[52px] rounded-xl border bg-qahwa-panel font-display text-xs uppercase text-qahwa-text shadow-panel transition hover:border-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              takeaway ? "border-white ring-2 ring-white" : "border-qahwa-border"
            }`}
          >
            + Commande à emporter
          </button>

          <div className="flex-1 [&>section]:h-full">
            <FloorPlan
              tables={displayedTables}
              orders={orders}
              selectedId={selectedTableId}
              onSelect={selectTable}
              onToggleReserved={(table) => void toggleReserved(table)}
            />
          </div>
        </div>

        <section
          aria-label="Commande"
          className={`${surface} flex min-h-[560px] min-w-0 flex-col overflow-hidden xl:h-[calc(100dvh-10rem)]`}
        >
          {order && selectedTable ? (
            <PaymentPanel
              key={order.id}
              order={order}
              tableNumber={selectedTable.number}
              items={orderItems.items}
              itemsLoading={orderItems.loading}
              itemsFailed={orderItems.failed}
              busy={busy}
              onPay={payCurrent}
              onServe={serveCurrent}
              onPrint={printCurrent}
              onChangeTable={() => setDialog("change")}
              onMerge={() => setDialog("merge")}
              onClose={closePanel}
            />
          ) : selectedTable || takeaway ? (
            <NewOrderPanel
              key={selectedTable?.id ?? "takeaway"}
              table={selectedTable}
              menu={menu}
              cart={cart}
              submitting={submitting}
              onSubmit={(name, phone) =>
                void (selectedTable
                  ? createTableOrder(name, phone)
                  : createTakeawayOrder(name, phone))
              }
              onClose={closePanel}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <h2 className="font-display text-2xl">Choisis une table</h2>
              <p className="mt-2 max-w-sm text-sm text-white/55">
                Une table vide ouvre le menu. Une table occupée ouvre son ticket et l'encaissement.
                Pour une vente sans table, utilise « Commande à emporter ».
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}