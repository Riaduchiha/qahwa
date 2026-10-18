
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createOrder } from "@/app/(public)/commander/actions";
import type {
  CafeTable,
  Category,
  Order,
  OrderItem,
  Product,
} from "@/types/database";
import type { CartItem } from "@/lib/store/cart";

type NoticeType = "success" | "error" | "info";

type Confirmation = {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  action: () => void | Promise<void>;
};

function playCashSound() {
  const AudioContextClass =
    window.AudioContext || (window as any).webkitAudioContext;

  if (!AudioContextClass) return;

  const ctx = new AudioContextClass();
  const now = ctx.currentTime;

  [
    { freq: 1046.5, delay: 0 },
    { freq: 1568, delay: 0.09 },
  ].forEach(({ freq, delay }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + delay);
    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(0.2, now + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + delay);
    osc.stop(now + delay + 0.36);
  });

  window.setTimeout(() => void ctx.close(), 1000);
}

type TableStatus = "vide" | "reservee" | "attente" | "prete" | "servie";

type StatusStyle = {
  label: string;
  card: string;
  dot: string;
};

const STATUS_STYLES: Record<TableStatus, StatusStyle> = {
  vide: {
    label: "Vide",
    card:
      "border-qahwa-border bg-qahwa-panel text-qahwa-text hover:border-qahwa-green/50",
    dot: "bg-qahwa-green",
  },
  reservee: {
    label: "Reservee",
    card:
      "border-qahwa-rouge/50 bg-qahwa-rouge/10 text-qahwa-text animate-qahwa-blink",
    dot: "bg-qahwa-rouge",
  },
  attente: {
    label: "Attend sa commande",
    card:
      "border-qahwa-orange/60 bg-qahwa-orange/10 text-qahwa-text animate-qahwa-blink",
    dot: "bg-qahwa-orange",
  },
  prete: {
    label: "Prete - a servir",
    card:
      "border-blue-400/60 bg-blue-400/10 text-qahwa-text animate-qahwa-blink",
    dot: "bg-blue-400",
  },
  servie: {
    label: "Servie",
    card: "border-cyan-400/40 bg-cyan-400/5 text-qahwa-text",
    dot: "bg-cyan-400",
  },
};

const CASH_NOTES = [200, 500, 1000, 2000];

const ACTIVE_STATUSES = [
  "recue",
  "preparation",
  "prete",
  "servi",
  "livraison",
];

type CategoryWithProducts = Category & {
  products: Product[];
};

function printTicket(
  order: Order,
  items: OrderItem[],
  tableNumber: number,
  onBlocked: () => void
) {
  const w = window.open("", "_blank", "width=380,height=640");

  if (!w) {
    onBlocked();
    return;
  }

  const escapeHtml = (value: unknown) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => {
      const entities: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return entities[char] ?? char;
    });

  const rows = items
    .map(
      (i) =>
        `<tr><td>${i.quantity} x ${escapeHtml(i.product_name)}</td><td style="text-align:right">${escapeHtml(i.line_total)} DA</td></tr>`
    )
    .join("");

  w.document.write(`
    <html>
      <head>
        <title>Ticket ${escapeHtml(order.order_number)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: "Courier New", monospace;
            padding: 16px;
            width: 280px;
            margin: 0;
          }
          h1 {
            font-size: 18px;
            text-align: center;
            margin: 0 0 4px;
            letter-spacing: 2px;
          }
          .sub {
            text-align: center;
            font-size: 11px;
            margin-bottom: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          td { padding: 3px 0; }
          .line {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          .total {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            font-size: 14px;
            margin-top: 8px;
          }
          .foot {
            text-align: center;
            font-size: 11px;
            margin-top: 16px;
          }
        </style>
      </head>
      <body>
        <h1>QAHWA</h1>
        <div class="sub">
          Commande ${escapeHtml(order.order_number)}<br/>
          Table ${escapeHtml(tableNumber)}<br/>
          ${escapeHtml(order.customer_name)}
        </div>
        <table>${rows}</table>
        <div class="line"></div>
        <div class="total">
          <span>Total</span>
          <span>${escapeHtml(order.total)} DA</span>
        </div>
        <div class="foot">Merci de votre visite</div>
      </body>
    </html>
  `);

  w.document.close();
  w.focus();
  w.print();
}

export default function QahwaTablesPage() {
  const [showChangeTables, setShowChangeTables] = useState(false);
  const [selectedTargetTableId, setSelectedTargetTableId] =
    useState<string | null>(null);

  const [tables, setTables] = useState<CafeTable[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);

  const [showMergeTables, setShowMergeTables] = useState(false);
  const [selectedMergeOrderId, setSelectedMergeOrderId] = useState<
    string | null
  >(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [checkoutTable, setCheckoutTable] = useState<CafeTable | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<Order | null>(null);
  const [checkoutItems, setCheckoutItems] = useState<OrderItem[]>([]);
  const [amountReceived, setAmountReceived] = useState("");
  const [closing, setClosing] = useState(false);

  const [posTable, setPosTable] = useState<CafeTable | null>(null);
  const [posCategories, setPosCategories] = useState<CategoryWithProducts[]>(
    []
  );
  const [posLoadingMenu, setPosLoadingMenu] = useState(false);
  const [posActiveCategory, setPosActiveCategory] = useState<string | null>(
    null
  );
  const [posCart, setPosCart] = useState<CartItem[]>([]);
  const [posCustomerName, setPosCustomerName] = useState("");
  const [posSubmitting, setPosSubmitting] = useState(false);
  const [posError, setPosError] = useState<string | null>(null);

  const [showQr, setShowQr] = useState(false);
  const [origin, setOrigin] = useState("");

  const [notification, setNotification] = useState<{
    message: string;
    type: NoticeType;
  } | null>(null);

  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [confirmationBusy, setConfirmationBusy] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousReadyIds = useRef<Set<string>>(new Set());

  function notify(message: string, type: NoticeType = "info") {
    setNotification({ message, type });
  }

  function askConfirmation(
    message: string,
    action: () => void | Promise<void>,
    options?: {
      title?: string;
      confirmLabel?: string;
      danger?: boolean;
    }
  ) {
    setConfirmation({
      title: options?.title ?? "Confirmation",
      message,
      confirmLabel: options?.confirmLabel ?? "Confirmer",
      danger: options?.danger ?? false,
      action,
    });
  }

  async function executeConfirmation() {
    if (!confirmation || confirmationBusy) return;

    const action = confirmation.action;
    setConfirmationBusy(true);

    try {
      await action();
      setConfirmation(null);
    } catch (error) {
      console.error("Erreur de confirmation :", error);
      notify("Une erreur inattendue est survenue.", "error");
    } finally {
      setConfirmationBusy(false);
    }
  }

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/poste/tables-data", {
        cache: "no-store",
      });

      if (!res.ok) return;

      const {
        tables: tablesData,
        orders: ordersData,
      } = (await res.json()) as {
        tables: CafeTable[];
        orders: Order[];
      };

      if (tablesData) {
        setTables(tablesData);
      }

      if (ordersData) {
        const currentReadyIds = new Set(
          ordersData
            .filter((o) => o.status === "prete" && !o.paid)
            .map((o) => o.id)
        );

        const hasNewReady = [...currentReadyIds].some(
          (id) => !previousReadyIds.current.has(id)
        );

        if (hasNewReady && previousReadyIds.current.size > 0) {
          audioRef.current?.play().catch(() => {});
        }

        previousReadyIds.current = currentReadyIds;
        setActiveOrders(ordersData);
      }
    } catch (error) {
      console.error("Erreur chargement des tables :", error);
    }
  }

  useEffect(() => {
    void load();

    const refreshInterval = setInterval(() => {
      void load();
    }, 2000);

    const channel = supabase
      .channel("tables-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => void load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables" },
        () => void load()
      )
      .subscribe();

    return () => {
      clearInterval(refreshInterval);
      void supabase.removeChannel(channel);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleReserved(t: CafeTable) {
    try {
      const res = await fetch("/api/poste/tables-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reserve",
          table_id: t.id,
          reserved: !t.reserved,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        notify("Erreur : " + (result.error ?? "Action impossible."), "error");
        return;
      }

      await load();
      notify(
        t.reserved
          ? `Réservation de la table ${t.number} annulée.`
          : `Table ${t.number} réservée.`,
        "success"
      );
    } catch {
      notify(
        "Erreur réseau lors de la modification de la réservation.",
        "error"
      );
    }
  }

  function statusFor(t: CafeTable): TableStatus {
    const activeOrder = activeOrders.find(
      (o) =>
        o.table_number === String(t.number) &&
        !o.paid &&
        ACTIVE_STATUSES.includes(o.status)
    );

    if (activeOrder) {
      if (activeOrder.status === "prete") return "prete";
      if (activeOrder.status === "servi") return "servie";
      return "attente";
    }

    if (t.reserved) return "reservee";

    return "vide";
  }

  async function openCheckout(t: CafeTable, order: Order) {
    setCheckoutTable(t);
    setCheckoutOrder(order);
    setAmountReceived("");
    setCheckoutItems([]);

    const { data: items, error } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id)
      .returns<OrderItem[]>();

    if (error) {
      notify("Impossible de charger les articles de cette commande.", "error");
      console.error(error);
    }

    if (items) setCheckoutItems(items);
  }

  function closeCheckout() {
    setShowChangeTables(false);
    setSelectedTargetTableId(null);
    setShowMergeTables(false);
    setSelectedMergeOrderId(null);
    setCheckoutTable(null);
    setCheckoutOrder(null);
    setCheckoutItems([]);
    setAmountReceived("");
  }

  async function markServed() {
    if (!checkoutOrder || closing) return;

    if (checkoutOrder.status !== "prete") {
      notify("Seule une commande prête peut être marquée comme servie.", "error");
      return;
    }

    setClosing(true);

    try {
      const res = await fetch("/api/poste/tables-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: checkoutOrder.id,
          action: "served",
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        notify(
          "Erreur : " + (result.error ?? "Impossible de marquer servie."),
          "error"
        );
        return;
      }

      setCheckoutOrder({ ...checkoutOrder, status: "servi" });
      await load();
      notify("Commande marquée comme servie.", "success");
    } catch {
      notify("Erreur réseau lors du changement de statut.", "error");
    } finally {
      setClosing(false);
    }
  }

  function changeTable() {
    if (!checkoutOrder || !checkoutTable || closing) return;

    const availableTables = tables.filter((table) => {
      if (table.id === checkoutTable.id || table.reserved) return false;

      return !activeOrders.some(
        (order) =>
          order.id !== checkoutOrder.id &&
          order.table_number === String(table.number) &&
          !order.paid &&
          ACTIVE_STATUSES.includes(order.status)
      );
    });

    if (availableTables.length === 0) {
      notify("Aucune autre table disponible.", "info");
      return;
    }

    setSelectedTargetTableId(null);
    setShowChangeTables(true);
  }

  async function confirmChangeTable() {
    if (
      !checkoutOrder ||
      !checkoutTable ||
      !selectedTargetTableId ||
      closing
    ) {
      return;
    }

    const targetTable = tables.find(
      (table) => table.id === selectedTargetTableId
    );

    if (!targetTable) {
      notify("Cette table n'existe plus.", "error");
      setShowChangeTables(false);
      setSelectedTargetTableId(null);
      return;
    }

    const targetHasOrder = activeOrders.some(
      (order) =>
        order.id !== checkoutOrder.id &&
        order.table_number === String(targetTable.number) &&
        !order.paid &&
        ACTIVE_STATUSES.includes(order.status)
    );

    if (
      targetTable.id === checkoutTable.id ||
      targetTable.reserved ||
      targetHasOrder
    ) {
      notify("Cette table n'est plus disponible. Choisis-en une autre.", "error");
      setSelectedTargetTableId(null);
      await load();
      return;
    }

    const order = checkoutOrder;
    const sourceTable = checkoutTable;

    askConfirmation(
      `Déplacer la commande ${order.order_number} de la table ${sourceTable.number} vers la table ${targetTable.number} ?`,
      async () => {
        setClosing(true);

        try {
          const res = await fetch("/api/poste/tables-action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: order.id,
              table_id: sourceTable.id,
              target_table_id: targetTable.id,
              action: "change_table",
            }),
          });

          const result = await res.json();

          if (!res.ok) {
            notify(
              "Erreur : " + (result.error ?? "Déplacement impossible."),
              "error"
            );
            return;
          }

          setShowChangeTables(false);
          setSelectedTargetTableId(null);
          closeCheckout();
          await load();

          notify(`Commande déplacée vers la table ${targetTable.number}.`, "success");
        } catch {
          notify("Erreur réseau : déplacement impossible.", "error");
        } finally {
          setClosing(false);
        }
      },
      {
        title: "Changer de table",
        confirmLabel: "Déplacer",
      }
    );
  }

  function mergePayment() {
    if (!checkoutOrder || !checkoutTable || closing) return;

    const otherOrders = activeOrders.filter(
      (order) =>
        order.id !== checkoutOrder.id &&
        order.order_type === "sur_place" &&
        !order.paid &&
        Boolean(order.table_number) &&
        order.table_number !== checkoutOrder.table_number &&
        ACTIVE_STATUSES.includes(order.status)
    );

    if (otherOrders.length === 0) {
      notify("Aucune autre commande active à encaisser avec celle-ci.", "info");
      return;
    }

    setSelectedMergeOrderId(null);
    setShowMergeTables(true);
  }

  async function confirmMergePayment() {
    if (!checkoutOrder || !checkoutTable || !selectedMergeOrderId || closing) {
      return;
    }

    const secondOrder = activeOrders.find(
      (order) =>
        order.id === selectedMergeOrderId &&
        order.id !== checkoutOrder.id &&
        order.order_type === "sur_place" &&
        !order.paid &&
        Boolean(order.table_number) &&
        order.table_number !== checkoutOrder.table_number &&
        ACTIVE_STATUSES.includes(order.status)
    );

    if (!secondOrder) {
      notify("Cette commande n'est plus disponible. Actualise les tables.", "error");
      setShowMergeTables(false);
      setSelectedMergeOrderId(null);
      await load();
      return;
    }

    const firstOrder = checkoutOrder;
    const sourceTable = checkoutTable;
    const combinedTotal =
      Number(firstOrder.total) + Number(secondOrder.total);

    askConfirmation(
      `Table ${firstOrder.table_number} : ${firstOrder.total} DA\n` +
        `Table ${secondOrder.table_number} : ${secondOrder.total} DA\n\n` +
        `Total à encaisser : ${combinedTotal.toLocaleString("fr-FR")} DA\n\n` +
        `Les deux commandes seront marquées comme payées et les deux tables seront libérées.`,
      async () => {
        setClosing(true);

        try {
          const res = await fetch("/api/poste/tables-action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: firstOrder.id,
              table_id: sourceTable.id,
              merge_order_id: secondOrder.id,
              action: "merge_paid",
            }),
          });

          const result = await res.json();

          if (!res.ok) {
            notify(
              "Erreur : " +
                (result.error ?? "Fusion des encaissements impossible."),
              "error"
            );
            return;
          }

          try {
            playCashSound();
          } catch {
            // Le navigateur peut bloquer le son.
          }

          setShowMergeTables(false);
          setSelectedMergeOrderId(null);
          closeCheckout();
          await load();

          notify(
            `Encaissement groupé terminé : ${combinedTotal.toLocaleString("fr-FR")} DA.`,
            "success"
          );
        } catch {
          notify("Erreur réseau : fusion des encaissements impossible.", "error");
        } finally {
          setClosing(false);
        }
      },
      {
        title: "Confirmer la fusion",
        confirmLabel: "Encaisser les deux",
      }
    );
  }

  async function markPaid() {
    if (!checkoutOrder || !checkoutTable || closing) return;

    const order = checkoutOrder;
    const table = checkoutTable;

    askConfirmation(
      `Confirmer l'encaissement de ${Number(order.total).toLocaleString("fr-FR")} DA pour la table ${table.number} ?`,
      async () => {
        setClosing(true);

        try {
          const res = await fetch("/api/poste/tables-action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: order.id,
              table_id: table.id,
              action: "paid",
            }),
          });

          const result = await res.json();

          if (!res.ok) {
            notify(
              "Erreur : " + (result.error ?? "Encaissement impossible."),
              "error"
            );
            return;
          }

          try {
            playCashSound();
          } catch {
            // Le navigateur peut bloquer le son.
          }

          closeCheckout();
          await load();
          notify("Encaissement effectué avec succès.", "success");
        } catch {
          notify("Erreur réseau lors de l'encaissement.", "error");
        } finally {
          setClosing(false);
        }
      },
      {
        title: "Confirmer l'encaissement",
        confirmLabel: "Encaisser",
      }
    );
  }

  async function openPosMenu(t: CafeTable) {
    setPosTable(t);
    setPosCart([]);
    setPosCustomerName("");
    setPosError(null);
    setPosLoadingMenu(true);

    try {
      const { data: categories, error: categoriesError } =
        await supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("display_order")
          .returns<Category[]>();

      const { data: products, error: productsError } =
        await supabase
          .from("products")
          .select("*")
          .eq("is_available", true)
          .order("display_order")
          .returns<Product[]>();

      if (categoriesError || productsError) {
        throw new Error("Impossible de charger le menu.");
      }

      const merged: CategoryWithProducts[] = (categories ?? []).map(
        (category) => ({
          ...category,
          products: (products ?? []).filter(
            (product) => product.category_id === category.id
          ),
        })
      );

      setPosCategories(merged);
      setPosActiveCategory(merged[0]?.id ?? null);
    } catch (error) {
      setPosError(
        error instanceof Error
          ? error.message
          : "Impossible de charger le menu."
      );
    } finally {
      setPosLoadingMenu(false);
    }
  }

  function closePosMenu() {
    setPosTable(null);
    setPosCart([]);
    setPosCustomerName("");
    setPosError(null);
  }

  function addToPosCart(product: Product) {
    setPosCart((cart) => {
      const existing = cart.find(
        (item) => item.productId === product.id
      );

      if (existing) {
        return cart.map((item) =>
          item.lineId === existing.lineId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...cart,
        {
          lineId: `${product.id}-${Date.now()}`,
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  }

  function changePosQty(lineId: string, quantity: number) {
    setPosCart((cart) => {
      if (quantity <= 0) {
        return cart.filter((item) => item.lineId !== lineId);
      }

      return cart.map((item) =>
        item.lineId === lineId ? { ...item, quantity } : item
      );
    });
  }

  const posTotal = posCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  async function submitPosOrder() {
    if (!posTable || posSubmitting) return;

    if (posCart.length === 0) {
      setPosError("Ajoute au moins un produit.");
      return;
    }

    setPosSubmitting(true);
    setPosError(null);

    try {
      const result = await createOrder({
        items: posCart,
        customerName: posCustomerName.trim() || "Client comptoir",
        customerPhone: "-",
        orderType: "sur_place",
        tableNumber: String(posTable.number),
      });

      if ("error" in result) {
        setPosError(result.error);
        return;
      }

      closePosMenu();
      await load();
      notify("Commande créée avec succès.", "success");
    } catch {
      setPosError("Impossible d'envoyer la commande. Réessaie.");
    } finally {
      setPosSubmitting(false);
    }
  }

  function handleTableClick(t: CafeTable) {
    const order = activeOrders.find(
      (o) =>
        o.table_number === String(t.number) &&
        !o.paid &&
        ACTIVE_STATUSES.includes(o.status)
    );

    if (order) {
      void openCheckout(t, order);
    } else {
      void openPosMenu(t);
    }
  }

  function handleReserveToggle(e: React.MouseEvent, t: CafeTable) {
    e.stopPropagation();
    void toggleReserved(t);
  }

  const total = Number(checkoutOrder?.total ?? 0);
  const received = parseFloat(amountReceived.replace(",", ".")) || 0;
  const change = received - total;

  const posActiveProducts =
    posCategories.find((category) => category.id === posActiveCategory)
      ?.products ?? [];

  const mergeableOrders = activeOrders.filter(
    (order) =>
      checkoutOrder &&
      order.id !== checkoutOrder.id &&
      order.order_type === "sur_place" &&
      !order.paid &&
      Boolean(order.table_number) &&
      order.table_number !== checkoutOrder.table_number &&
      ACTIVE_STATUSES.includes(order.status)
  );

  const availableChangeTables =
    checkoutTable && checkoutOrder
      ? tables.filter((table) => {
          if (table.id === checkoutTable.id || table.reserved) return false;

          return !activeOrders.some(
            (order) =>
              order.id !== checkoutOrder.id &&
              order.table_number === String(table.number) &&
              !order.paid &&
              ACTIVE_STATUSES.includes(order.status)
          );
        })
      : [];

  return (
    <div className="min-w-0 overflow-x-hidden">
      <audio
        ref={audioRef}
        src="/ready-notification.mp3"
        preload="auto"
      />

      {/* NOTIFICATION QAHWA */}
      {notification && (
        <div className="fixed right-4 top-4 z-[150] w-[calc(100%-2rem)] max-w-sm">
          <div
            role="status"
            aria-live="polite"
            className={`rounded-xl border bg-qahwa-panel p-4 shadow-2xl ${
              notification.type === "success"
                ? "border-qahwa-green/60"
                : notification.type === "error"
                  ? "border-qahwa-rouge/60"
                  : "border-qahwa-orange/60"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold ${
                  notification.type === "success"
                    ? "bg-qahwa-green/15 text-qahwa-green"
                    : notification.type === "error"
                      ? "bg-qahwa-rouge/15 text-qahwa-rouge"
                      : "bg-qahwa-orange/15 text-qahwa-orange"
                }`}
              >
                {notification.type === "success"
                  ? "✓"
                  : notification.type === "error"
                    ? "!"
                    : "i"}
              </span>

              <p className="flex-1 whitespace-pre-line pt-1 text-sm leading-relaxed text-qahwa-text">
                {notification.message}
              </p>

              <button
                type="button"
                onClick={() => setNotification(null)}
                className="shrink-0 px-1 text-qahwa-muted hover:text-qahwa-orange"
                aria-label="Fermer la notification"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION QAHWA */}
      {confirmation && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !confirmationBusy) {
              setConfirmation(null);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="qahwa-confirmation-title"
            aria-describedby="qahwa-confirmation-message"
            className="w-full max-w-md rounded-2xl border border-qahwa-orange/50 bg-qahwa-panel p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-qahwa-orange/40 bg-qahwa-orange/10 font-display text-xl text-qahwa-orange">
                !
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-widest text-qahwa-orange">
                  Qahwa · Confirmation
                </p>
                <h2
                  id="qahwa-confirmation-title"
                  className="mt-1 font-display text-lg uppercase text-qahwa-text"
                >
                  {confirmation.title}
                </h2>
              </div>
            </div>

            <p
              id="qahwa-confirmation-message"
              className="whitespace-pre-line text-sm leading-relaxed text-qahwa-muted"
            >
              {confirmation.message}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={confirmationBusy}
                onClick={() => setConfirmation(null)}
                className="rounded-xl border border-qahwa-border bg-qahwa-panel2 px-3 py-3 font-display text-xs uppercase text-qahwa-text hover:border-qahwa-orange disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={confirmationBusy}
                onClick={() => void executeConfirmation()}
                className={`rounded-xl border px-3 py-3 font-display text-xs uppercase shadow-panel disabled:cursor-wait disabled:opacity-50 ${
                  confirmation.danger
                    ? "border-qahwa-rouge bg-qahwa-rouge text-white"
                    : "border-qahwa-orange bg-qahwa-orange text-qahwa-noir"
                }`}
              >
                {confirmationBusy ? "Traitement..." : confirmation.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 items-center justify-between gap-3">
        <h1 className="font-display text-2xl uppercase text-qahwa-text">
          Tables
        </h1>

        <button
          type="button"
          onClick={() => setShowQr((value) => !value)}
          className="shrink-0 rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-1.5 text-xs font-display uppercase text-qahwa-muted transition hover:text-qahwa-orange"
        >
          {showQr ? "Masquer les QR codes" : "Voir les QR codes"}
        </button>
      </div>

      <p className="mt-1 max-w-4xl text-sm text-qahwa-muted">
        Touche une table vide ou réservée pour prendre une commande au
        comptoir. Touche une table occupée pour consulter sa commande,
        la marquer servie ou l'encaisser. Le petit rond en haut à droite
        permet de gérer la réservation.
      </p>

      {showQr && (
        <div className="mt-4 rounded-xl border border-qahwa-border bg-qahwa-panel p-4 shadow-panel">
          <p className="mb-3 text-xs uppercase text-qahwa-muted">
            QR code de chaque table
          </p>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
            {tables.map((t) => {
              const qrTarget = `${origin}/commander?table=${t.number}`;
              const qrImg =
                `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrTarget)}`;

              return (
                <div
                  key={t.id}
                  className="flex min-w-0 flex-col items-center gap-1 rounded-lg border border-qahwa-border bg-qahwa-panel2 p-2 text-center"
                >
                  <span className="font-display text-sm text-qahwa-text">
                    Table {t.number}
                  </span>

                  {origin && (
                    <div className="rounded-md bg-white p-1">
                      <img
                        src={qrImg}
                        alt={`QR code table ${t.number}`}
                        className="h-16 w-16"
                      />
                    </div>
                  )}

                  <span className="text-[9px] text-qahwa-muted">
                    Clic droit pour enregistrer
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-qahwa-muted">
        {(Object.keys(STATUS_STYLES) as TableStatus[]).map((status) => (
          <div key={status} className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full ${STATUS_STYLES[status].dot}`}
            />
            {STATUS_STYLES[status].label}
          </div>
        ))}
      </div>

      {/* TABLES */}
      <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
        {tables.map((t) => {
          const status = statusFor(t);
          const style = STATUS_STYLES[status];

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTableClick(t)}
              className={`relative flex aspect-square min-w-0 flex-col items-center justify-center rounded-xl border shadow-panel transition ${style.card}`}
            >
              {(status === "vide" || status === "reservee") && (
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => handleReserveToggle(e, t)}
                  className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-qahwa-border bg-qahwa-rouge/40"
                  aria-label="Marquer ou libérer la réservation"
                />
              )}

              <span className="font-display text-lg leading-none sm:text-xl">
                {t.number}
              </span>

              <span
                className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
                aria-hidden
              />

              <span className="mt-2 w-full px-1 text-center text-[8px] font-medium uppercase leading-[1.15] text-qahwa-muted sm:text-[10px]">
                {style.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* CHECKOUT */}
      {checkoutTable && checkoutOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-4">
          <div className="my-auto w-full max-w-sm rounded-2xl border border-qahwa-border bg-qahwa-panel p-4 shadow-panel sm:p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <h2 className="font-display text-xl uppercase text-qahwa-text">
                  Table {checkoutTable.number}
                </h2>

                <p className="truncate text-xs text-qahwa-muted">
                  Commande {checkoutOrder.order_number}
                </p>
              </div>

              <button
                type="button"
                onClick={closeCheckout}
                disabled={closing}
                className="h-8 w-8 shrink-0 rounded-full border border-qahwa-border font-display text-qahwa-muted hover:text-qahwa-orange disabled:opacity-50"
                aria-label="Fermer"
              >
                X
              </button>
            </div>

            <div className="mt-3 rounded-lg border border-qahwa-border bg-qahwa-panel2 p-3 text-sm">
              <p className="font-display uppercase text-qahwa-text">
                {checkoutOrder.customer_name}
              </p>
              <p className="text-qahwa-muted">
                {checkoutOrder.customer_phone}
              </p>
            </div>

            <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-qahwa-border bg-qahwa-panel2 p-3 text-sm text-qahwa-text">
              {checkoutItems.length === 0 && (
                <li className="text-qahwa-muted">Chargement...</li>
              )}

              {checkoutItems.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {item.quantity} x {item.product_name}
                  </span>
                  <span className="shrink-0">{item.line_total} DA</span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex justify-between rounded-lg border border-qahwa-orange/40 bg-qahwa-orange/10 p-3 font-display text-lg uppercase text-qahwa-text">
              <span>Total</span>
              <span>{total} DA</span>
            </div>

            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => void markServed()}
                disabled={closing || checkoutOrder.status !== "prete"}
                className="w-full rounded-xl border border-cyan-400/60 bg-cyan-400/15 py-3 font-display uppercase text-cyan-300 shadow-panel disabled:cursor-not-allowed disabled:opacity-40"
              >
                {checkoutOrder.status === "servi"
                  ? "Commande déjà servie"
                  : checkoutOrder.status === "prete"
                    ? "Marquer servi"
                    : "En attente de préparation"}
              </button>

              <button
                type="button"
                onClick={changeTable}
                disabled={closing}
                className="w-full rounded-xl border border-qahwa-border bg-qahwa-panel2 py-3 font-display text-xs uppercase text-qahwa-text shadow-panel hover:border-qahwa-orange disabled:opacity-50"
              >
                Changer de table
              </button>

              <button
                type="button"
                onClick={mergePayment}
                disabled={closing}
                className="w-full rounded-xl border border-violet-400/60 bg-violet-500/15 py-3 font-display text-xs uppercase text-violet-300 shadow-panel hover:bg-violet-500/25 disabled:opacity-50"
              >
                Fusionner les tables
              </button>
            </div>

            <div className="mt-4">
              <p className="mb-1 text-xs uppercase text-qahwa-muted">
                Montant reçu
              </p>

              <input
                inputMode="decimal"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-2 text-lg font-display text-qahwa-text"
              />

              <div className="mt-2 grid grid-cols-3 gap-2">
                {CASH_NOTES.map((note) => (
                  <button
                    key={note}
                    type="button"
                    onClick={() =>
                      setAmountReceived(String(received + note))
                    }
                    className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-2 py-2 text-sm font-display text-qahwa-text hover:border-qahwa-orange"
                  >
                    +{note}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setAmountReceived(String(total))}
                  className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-2 py-2 text-sm font-display text-qahwa-text hover:border-qahwa-orange"
                >
                  Exact
                </button>

                <button
                  type="button"
                  onClick={() => setAmountReceived("")}
                  className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-2 py-2 text-sm font-display text-qahwa-text hover:border-qahwa-orange"
                >
                  Effacer
                </button>
              </div>

              {amountReceived !== "" && (
                <div
                  className={`mt-3 rounded-lg border p-3 text-center font-display text-lg uppercase text-qahwa-text ${
                    change >= 0
                      ? "border-qahwa-green/40 bg-qahwa-green/15"
                      : "border-qahwa-rouge/40 bg-qahwa-rouge/15"
                  }`}
                >
                  {change >= 0
                    ? `Monnaie à rendre : ${change} DA`
                    : `Il manque : ${Math.abs(change)} DA`}
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!checkoutOrder || !checkoutTable) return;

                  printTicket(
                    checkoutOrder,
                    checkoutItems,
                    checkoutTable.number,
                    () =>
                      notify(
                        "L'impression est bloquée par le navigateur. Autorise les fenêtres pop-up pour le site Qahwa, puis réessaie.",
                        "error"
                      )
                  );
                }}
                className="min-w-0 rounded-xl border border-qahwa-border bg-qahwa-panel2 px-2 py-3 font-display text-xs uppercase text-qahwa-text shadow-panel hover:border-qahwa-orange"
              >
                Imprimer
              </button>

              <button
                type="button"
                disabled={closing}
                onClick={() => void markPaid()}
                className="min-w-0 rounded-xl border border-qahwa-orange bg-qahwa-orange px-2 py-3 font-display text-xs uppercase text-qahwa-noir shadow-panel disabled:opacity-60"
              >
                {closing ? "Traitement..." : "Encaisser"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SÉLECTION VISUELLE POUR CHANGER DE TABLE */}
      {showChangeTables && checkoutTable && checkoutOrder && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/80 p-3 sm:p-5">
          <div className="my-auto w-full max-w-lg rounded-2xl border border-qahwa-orange/50 bg-qahwa-panel p-4 shadow-panel sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-qahwa-orange">
                  Déplacement de commande
                </p>

                <h2 className="mt-1 font-display text-xl uppercase text-qahwa-text">
                  Choisir une table
                </h2>

                <p className="mt-1 text-xs text-qahwa-muted">
                  Commande actuelle : table {checkoutTable.number}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowChangeTables(false);
                  setSelectedTargetTableId(null);
                }}
                disabled={closing}
                className="h-9 w-9 shrink-0 rounded-full border border-qahwa-border text-qahwa-muted hover:border-qahwa-orange hover:text-qahwa-orange disabled:opacity-50"
                aria-label="Fermer la sélection"
              >
                X
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-qahwa-orange/30 bg-qahwa-orange/10 p-3">
              <p className="text-[10px] uppercase text-qahwa-orange">
                Commande à déplacer
              </p>

              <div className="mt-1 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg text-qahwa-text">
                    Table {checkoutTable.number}
                  </p>
                  <p className="truncate text-xs text-qahwa-muted">
                    {checkoutOrder.order_number}
                  </p>
                </div>

                <p className="shrink-0 font-display text-lg text-qahwa-orange">
                  {checkoutOrder.total} DA
                </p>
              </div>
            </div>

            <p className="mb-2 mt-4 text-xs uppercase text-qahwa-muted">
              Tables disponibles
            </p>

            <div className="grid max-h-[42vh] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
              {availableChangeTables.map((table) => {
                const isSelected = selectedTargetTableId === table.id;

                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => setSelectedTargetTableId(table.id)}
                    disabled={closing}
                    aria-pressed={isSelected}
                    className={`relative flex aspect-square min-w-0 flex-col items-center justify-center rounded-xl border transition disabled:opacity-50 ${
                      isSelected
                        ? "border-qahwa-orange bg-qahwa-orange/20 ring-2 ring-qahwa-orange/40"
                        : "border-qahwa-border bg-qahwa-panel2 hover:border-qahwa-orange/60"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-qahwa-orange text-xs font-bold text-black">
                        ✓
                      </span>
                    )}

                    <span className="text-[9px] uppercase text-qahwa-muted">
                      Table
                    </span>

                    <span className="mt-1 font-display text-2xl text-qahwa-text">
                      {table.number}
                    </span>

                    <span
                      className={`mt-2 h-2.5 w-2.5 rounded-full ${
                        isSelected ? "bg-qahwa-orange" : "bg-qahwa-green"
                      }`}
                    />

                    <span className="mt-1 text-[9px] uppercase text-qahwa-muted">
                      {isSelected ? "Sélectionnée" : "Disponible"}
                    </span>
                  </button>
                );
              })}
            </div>

            {availableChangeTables.length === 0 && (
              <div className="rounded-xl border border-qahwa-border bg-qahwa-panel2 p-4 text-center">
                <p className="text-sm text-qahwa-muted">
                  Aucune table disponible pour le moment.
                </p>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowChangeTables(false);
                  setSelectedTargetTableId(null);
                }}
                disabled={closing}
                className="rounded-xl border border-qahwa-border bg-qahwa-panel2 px-3 py-3 font-display text-xs uppercase text-qahwa-muted hover:text-qahwa-text disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={() => void confirmChangeTable()}
                disabled={closing || !selectedTargetTableId}
                className="rounded-xl border border-qahwa-orange bg-qahwa-orange px-3 py-3 font-display text-xs uppercase text-qahwa-noir shadow-panel disabled:cursor-not-allowed disabled:opacity-40"
              >
                {closing ? "Traitement..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SÉLECTION VISUELLE DES TABLES À FUSIONNER */}
      {showMergeTables && checkoutTable && checkoutOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/80 p-3 sm:p-5">
          <div className="my-auto w-full max-w-lg rounded-2xl border border-violet-400/50 bg-qahwa-panel p-4 shadow-panel sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-violet-300">
                  Encaissement groupé
                </p>

                <h2 className="mt-1 font-display text-xl uppercase text-qahwa-text">
                  Choisir une table
                </h2>

                <p className="mt-1 text-xs text-qahwa-muted">
                  Sélectionne la table à encaisser avec la table{" "}
                  {checkoutTable.number}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowMergeTables(false);
                  setSelectedMergeOrderId(null);
                }}
                disabled={closing}
                className="h-9 w-9 shrink-0 rounded-full border border-qahwa-border text-qahwa-muted hover:border-violet-400 hover:text-violet-300 disabled:opacity-50"
                aria-label="Fermer la sélection"
              >
                X
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-violet-400/30 bg-violet-500/10 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase text-violet-300">
                    Première table
                  </p>
                  <p className="mt-1 font-display text-sm uppercase text-qahwa-text">
                    Table {checkoutTable.number}
                  </p>
                  <p className="text-xs text-qahwa-muted">
                    {checkoutOrder.order_number}
                  </p>
                </div>

                <p className="shrink-0 font-display text-lg text-violet-300">
                  {checkoutOrder.total} DA
                </p>
              </div>
            </div>

            <p className="mb-2 mt-4 text-xs uppercase text-qahwa-muted">
              Choisis la deuxième table
            </p>

            {mergeableOrders.length === 0 ? (
              <div className="rounded-xl border border-qahwa-border bg-qahwa-panel2 p-4 text-center">
                <p className="text-sm text-qahwa-muted">
                  Aucune autre commande active disponible.
                </p>
              </div>
            ) : (
              <div className="grid max-h-[40vh] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
                {mergeableOrders.map((order) => {
                  const isSelected = selectedMergeOrderId === order.id;

                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setSelectedMergeOrderId(order.id)}
                      disabled={closing}
                      aria-pressed={isSelected}
                      className={`relative flex min-h-28 min-w-0 flex-col items-start justify-between rounded-xl border p-3 text-left transition disabled:opacity-50 ${
                        isSelected
                          ? "border-violet-300 bg-violet-500/20 ring-2 ring-violet-400/40"
                          : "border-qahwa-border bg-qahwa-panel2 hover:border-violet-400/60 hover:bg-violet-500/10"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-violet-400 text-xs font-bold text-black">
                          ✓
                        </span>
                      )}

                      <div className="min-w-0 pr-5">
                        <p className="text-[10px] uppercase text-qahwa-muted">
                          Table
                        </p>
                        <p className="font-display text-2xl text-qahwa-text">
                          {order.table_number}
                        </p>
                      </div>

                      <div className="mt-2 min-w-0 w-full">
                        <p className="truncate text-[10px] text-qahwa-muted">
                          {order.order_number}
                        </p>
                        <p className="mt-1 font-display text-sm text-violet-300">
                          {order.total} DA
                        </p>
                        <p className="mt-1 truncate text-[9px] uppercase text-qahwa-muted">
                          {order.status}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-4 rounded-xl border border-qahwa-border bg-qahwa-panel2 p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-qahwa-muted">
                  Total des deux commandes
                </span>
                <span className="font-display text-lg text-qahwa-text">
                  {(
                    Number(checkoutOrder.total) +
                    Number(
                      mergeableOrders.find(
                        (order) => order.id === selectedMergeOrderId
                      )?.total ?? 0
                    )
                  ).toLocaleString("fr-FR")}{" "}
                  DA
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowMergeTables(false);
                  setSelectedMergeOrderId(null);
                }}
                disabled={closing}
                className="rounded-xl border border-qahwa-border bg-qahwa-panel2 px-3 py-3 font-display text-xs uppercase text-qahwa-muted hover:text-qahwa-text disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={() => void confirmMergePayment()}
                disabled={
                  closing ||
                  !selectedMergeOrderId ||
                  !mergeableOrders.some(
                    (order) => order.id === selectedMergeOrderId
                  )
                }
                className="rounded-xl border border-violet-400 bg-violet-500 px-3 py-3 font-display text-xs uppercase text-white shadow-panel transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {closing ? "Traitement..." : "Confirmer la fusion"}
              </button>
            </div>

            <p className="mt-3 text-center text-[10px] leading-relaxed text-qahwa-muted">
              Les deux commandes seront marquées comme payées et les deux
              tables seront libérées après confirmation.
            </p>
          </div>
        </div>
      )}

      {/* POS MOBILE + DESKTOP */}
      {posTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/70 p-0 sm:p-3">
          <div className="flex h-full w-full min-w-0 flex-col overflow-hidden rounded-none border border-qahwa-border bg-qahwa-panel shadow-panel sm:h-[92vh] sm:max-w-5xl sm:rounded-2xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-qahwa-border p-3 sm:p-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-qahwa-muted">
                  Nouvelle commande
                </p>
                <h2 className="truncate font-display text-lg uppercase text-qahwa-text sm:text-xl">
                  Table {posTable.number}
                </h2>
              </div>

              <button
                type="button"
                onClick={closePosMenu}
                className="h-9 w-9 shrink-0 rounded-full border border-qahwa-border font-display text-qahwa-muted hover:text-qahwa-orange"
                aria-label="Fermer"
              >
                X
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div className="shrink-0 overflow-x-auto border-b border-qahwa-border p-2.5 sm:p-3">
                  <div className="flex w-max gap-2">
                    {posLoadingMenu && (
                      <span className="text-sm text-qahwa-muted">
                        Chargement du menu...
                      </span>
                    )}

                    {posCategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setPosActiveCategory(category.id)}
                        className={`min-h-9 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-display uppercase ${
                          posActiveCategory === category.id
                            ? "border-qahwa-orange bg-qahwa-orange text-qahwa-noir"
                            : "border-qahwa-border bg-qahwa-panel2 text-qahwa-muted"
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-2.5 sm:p-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {posActiveProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addToPosCart(product)}
                        className="min-w-0 rounded-xl border border-qahwa-border bg-qahwa-panel2 p-3 text-left shadow-panel transition hover:border-qahwa-orange/60 active:scale-[0.98]"
                      >
                        <p className="truncate font-display text-xs uppercase text-qahwa-text sm:text-sm">
                          {product.name}
                        </p>
                        <p className="mt-1 text-xs text-qahwa-orange">
                          {product.price} DA
                        </p>
                      </button>
                    ))}

                    {!posLoadingMenu && posActiveProducts.length === 0 && (
                      <p className="col-span-full py-8 text-center text-sm text-qahwa-muted">
                        Aucun produit dans cette catégorie.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex max-h-[42%] w-full shrink-0 flex-col border-t border-qahwa-border md:max-h-none md:w-72 md:border-l md:border-t-0">
                <div className="flex shrink-0 items-center justify-between border-b border-qahwa-border p-3">
                  <p className="font-display text-sm uppercase text-qahwa-muted">
                    Panier
                  </p>

                  <span className="rounded-full bg-qahwa-orange/10 px-2 py-1 text-[10px] font-bold text-qahwa-orange">
                    {posCart.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                    article
                    {posCart.reduce((sum, item) => sum + item.quantity, 0) > 1
                      ? "s"
                      : ""}
                  </span>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {posCart.length === 0 && (
                    <div className="flex min-h-20 items-center justify-center rounded-xl border border-dashed border-qahwa-border bg-qahwa-panel2 p-4 text-center">
                      <p className="text-xs text-qahwa-muted">
                        Touche un produit pour l'ajouter.
                      </p>
                    </div>
                  )}

                  <ul className="space-y-2">
                    {posCart.map((item) => (
                      <li
                        key={item.lineId}
                        className="rounded-xl border border-qahwa-border bg-qahwa-panel2 p-2.5 text-sm text-qahwa-text"
                      >
                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <span className="min-w-0 truncate font-display text-xs uppercase">
                            {item.name}
                          </span>
                          <span className="shrink-0 text-xs">
                            {item.price * item.quantity} DA
                          </span>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                changePosQty(item.lineId, item.quantity - 1)
                              }
                              className="h-7 w-7 rounded-full border border-qahwa-border font-display"
                            >
                              -
                            </button>

                            <span className="w-5 text-center text-xs">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                changePosQty(item.lineId, item.quantity + 1)
                              }
                              className="h-7 w-7 rounded-full border border-qahwa-border font-display"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => changePosQty(item.lineId, 0)}
                            className="text-[10px] uppercase text-qahwa-rouge"
                          >
                            Suppr.
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="shrink-0 border-t border-qahwa-border bg-qahwa-panel p-3">
                  <input
                    value={posCustomerName}
                    onChange={(e) => setPosCustomerName(e.target.value)}
                    placeholder="Nom client (optionnel)"
                    className="mb-2 min-h-10 w-full rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-2 text-sm text-qahwa-text placeholder:text-qahwa-muted"
                  />

                  <div className="mb-2 flex items-center justify-between gap-2 font-display text-base uppercase text-qahwa-text">
                    <span>Total</span>
                    <span className="text-qahwa-orange">{posTotal} DA</span>
                  </div>

                  {posError && (
                    <p className="mb-2 rounded-lg bg-qahwa-rouge/10 p-2 text-xs text-red-500">
                      {posError}
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={posSubmitting || posLoadingMenu}
                    onClick={() => void submitPosOrder()}
                    className="min-h-11 w-full rounded-xl border border-qahwa-orange bg-qahwa-orange py-2.5 font-display text-xs uppercase text-qahwa-noir shadow-panel disabled:opacity-60"
                  >
                    {posSubmitting ? "Envoi..." : "Valider la commande"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
