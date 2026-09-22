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

function playCashSound() {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const now = ctx.currentTime;

  const notes = [
    { freq: 1046.5, delay: 0 },
    { freq: 1568, delay: 0.09 },
  ];

  notes.forEach(({ freq, delay }) => {
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
}

type TableStatus = "vide" | "reservee" | "attente" | "prete" | "servie";

type StatusStyle = { label: string; card: string; dot: string };

const STATUS_STYLES: Record<TableStatus, StatusStyle> = {
  vide: {
    label: "Vide",
    card: "border-qahwa-border bg-qahwa-panel text-qahwa-text hover:border-qahwa-green/50",
    dot: "bg-qahwa-green",
  },
  reservee: {
    label: "Reservee",
    card: "border-qahwa-rouge/50 bg-qahwa-rouge/10 text-qahwa-text animate-qahwa-blink",
    dot: "bg-qahwa-rouge",
  },
  attente: {
    label: "Attend sa commande",
    card: "border-qahwa-orange/60 bg-qahwa-orange/10 text-qahwa-text animate-qahwa-blink",
    dot: "bg-qahwa-orange",
  },
  prete: {
    label: "Prete - a servir",
    card: "border-blue-400/60 bg-blue-400/10 text-qahwa-text animate-qahwa-blink",
    dot: "bg-blue-400",
  },
  servie: {
    label: "Servie",
    card: "border-cyan-400/40 bg-cyan-400/5 text-qahwa-text",
    dot: "bg-cyan-400",
  },
};

const CASH_NOTES = [200, 500, 1000, 2000];

type CategoryWithProducts = Category & { products: Product[] };

function printTicket(order: Order, items: OrderItem[], tableNumber: number) {
  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) return;

  const rows = items
    .map(
      (i) =>
        `<tr><td>${i.quantity} x ${i.product_name}</td><td style="text-align:right">${i.line_total} DA</td></tr>`
    )
    .join("");

  w.document.write(`
    <html>
      <head>
        <title>Ticket ${order.order_number}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: "Courier New", monospace; padding: 16px; width: 280px; margin: 0; }
          h1 { font-size: 18px; text-align: center; margin: 0 0 4px; letter-spacing: 2px; }
          .sub { text-align: center; font-size: 11px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          td { padding: 3px 0; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          .total { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 8px; }
          .foot { text-align: center; font-size: 11px; margin-top: 16px; }
        </style>
      </head>
      <body>
        <h1>QAHWA</h1>
        <div class="sub">
          Commande ${order.order_number}<br/>
          Table ${tableNumber}<br/>
          ${order.customer_name}
        </div>
        <table>${rows}</table>
        <div class="line"></div>
        <div class="total"><span>Total</span><span>${order.total} DA</span></div>
        <div class="foot">Merci de votre visite</div>
      </body>
    </html>
  `);
  w.document.close();
  w.focus();
  w.print();
}

export default function QahwaTablesPage() {
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousReadyIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function load() {
    const res = await fetch("/api/poste/tables-data");
    if (!res.ok) return;
    const { tables: tablesData, orders: ordersData } = (await res.json()) as {
      tables: CafeTable[];
      orders: Order[];
    };
    if (tablesData) setTables(tablesData as CafeTable[]);

    if (ordersData) {
      const currentReadyIds = new Set(
        ordersData.filter((o) => o.status === "prete").map((o) => o.id)
      );
      const hasNewReady = [...currentReadyIds].some(
        (id) => !previousReadyIds.current.has(id)
      );
      if (hasNewReady) {
        audioRef.current?.play().catch(() => {});
      }
      previousReadyIds.current = currentReadyIds;
      setActiveOrders(ordersData);
    }
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel("tables-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleReserved(t: CafeTable) {
    const res = await fetch("/api/poste/table-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reserve",
        table_id: t.id,
        reserved: !t.reserved,
      }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      alert("Erreur : " + error);
      return;
    }
    load();
  }

  function statusFor(t: CafeTable): TableStatus {
    const activeOrder = activeOrders.find(
      (o) => o.table_number === String(t.number)
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

    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id)
      .returns<OrderItem[]>();
    if (items) setCheckoutItems(items);
  }

  function closeCheckout() {
    setCheckoutTable(null);
    setCheckoutOrder(null);
    setCheckoutItems([]);
    setAmountReceived("");
  }

  async function markServed() {
    if (!checkoutOrder) return;
    const res = await fetch("/api/poste/table-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: checkoutOrder.id, action: "served" }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      alert("Erreur : " + error);
      return;
    }
    setCheckoutOrder({ ...checkoutOrder, status: "servi" });
    load();
  }

  async function markPaid() {
    if (!checkoutOrder || !checkoutTable) return;
    setClosing(true);
    try {
      playCashSound();
    } catch {
      // ignore si le navigateur bloque le son
    }
    const res = await fetch("/api/poste/table-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: checkoutOrder.id,
        table_id: checkoutTable.id,
        action: "paid",
      }),
    });
    setClosing(false);

    if (!res.ok) {
      const { error } = await res.json();
      alert("Erreur : " + error);
      return;
    }

    closeCheckout();
    load();
  }

  async function openPosMenu(t: CafeTable) {
    setPosTable(t);
    setPosCart([]);
    setPosCustomerName("");
    setPosError(null);
    setPosLoadingMenu(true);

    const { data: categories } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order")
      .returns<Category[]>();

    const { data: products } = await supabase
      .from("products")
      .select("*")
      .eq("is_available", true)
      .order("display_order")
      .returns<Product[]>();

    const merged: CategoryWithProducts[] = (categories ?? []).map((c) => ({
      ...c,
      products: (products ?? []).filter((p) => p.category_id === c.id),
    }));

    setPosCategories(merged);
    setPosActiveCategory(merged[0]?.id ?? null);
    setPosLoadingMenu(false);
  }

  function closePosMenu() {
    setPosTable(null);
    setPosCart([]);
    setPosCustomerName("");
    setPosError(null);
  }

  function addToPosCart(product: Product) {
    setPosCart((cart) => {
      const existing = cart.find((i) => i.productId === product.id);
      if (existing) {
        return cart.map((i) =>
          i.lineId === existing.lineId
            ? { ...i, quantity: i.quantity + 1 }
            : i
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
      if (quantity <= 0) return cart.filter((i) => i.lineId !== lineId);
      return cart.map((i) => (i.lineId === lineId ? { ...i, quantity } : i));
    });
  }

  const posTotal = posCart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  async function submitPosOrder() {
    if (!posTable) return;
    if (posCart.length === 0) {
      setPosError("Ajoute au moins un produit.");
      return;
    }
    setPosSubmitting(true);
    setPosError(null);

    const result = await createOrder({
      items: posCart,
      customerName: posCustomerName.trim() || "Client comptoir",
      customerPhone: "-",
      orderType: "sur_place",
      tableNumber: String(posTable.number),
    });

    setPosSubmitting(false);

    if ("error" in result) {
      setPosError(result.error);
      return;
    }

    closePosMenu();
    load();
  }

  function handleTableClick(t: CafeTable) {
    const order = activeOrders.find(
      (o) => o.table_number === String(t.number)
    );
    if (order) {
      openCheckout(t, order);
    } else {
      openPosMenu(t);
    }
  }

  function handleReserveToggle(e: React.MouseEvent, t: CafeTable) {
    e.stopPropagation();
    toggleReserved(t);
  }

  const total = checkoutOrder?.total ?? 0;
  const received = parseFloat(amountReceived.replace(",", ".")) || 0;
  const change = received - total;

  const posActiveProducts =
    posCategories.find((c) => c.id === posActiveCategory)?.products ?? [];

  return (
    <div>
      <audio ref={audioRef} src="/ready-notification.mp3" preload="auto" />
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl uppercase text-qahwa-text">
          Tables
        </h1>
        <button
          type="button"
          onClick={() => setShowQr((v) => !v)}
          className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-1.5 text-xs font-display uppercase text-qahwa-muted transition hover:text-qahwa-orange"
        >
          {showQr ? "Masquer les QR codes" : "Voir les QR codes"}
        </button>
      </div>
      <p className="mt-1 text-sm text-qahwa-muted">
        Touche une table vide ou reservee pour prendre une commande au
        comptoir. Touche une table qui attend sa commande pour
        l&apos;encaisser. Le petit rond en haut a droite de chaque case
        marque/libere la reservation.
      </p>

      {showQr && (
        <div className="mt-4 rounded-xl border border-qahwa-border bg-qahwa-panel p-4 shadow-panel">
          <p className="mb-3 text-xs uppercase text-qahwa-muted">
            QR code de chaque table (a coller sur la table)
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
            {tables.map((t) => {
              const qrTarget = `${origin}/commander?table=${t.number}`;
              const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                qrTarget
              )}`;
              return (
                <div
                  key={t.id}
                  className="flex flex-col items-center gap-1 rounded-lg border border-qahwa-border bg-qahwa-panel2 p-2 text-center"
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
                    Clic droit sur l&apos;image pour enregistrer
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-qahwa-muted">
        {(Object.keys(STATUS_STYLES) as TableStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full ${STATUS_STYLES[s].dot}`}
            />
            {STATUS_STYLES[s].label}
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">
        {tables.map((t) => {
          const status = statusFor(t);
          const style = STATUS_STYLES[status];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTableClick(t)}
              className={`relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border shadow-panel transition ${style.card}`}
            >
              {status === "vide" || status === "reservee" ? (
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => handleReserveToggle(e, t)}
                  className="absolute right-1.5 top-1.5 h-3.5 w-3.5 rounded-full border border-qahwa-border bg-qahwa-rouge/40"
                  aria-label="Marquer/liberer la reservation"
                />
              ) : null}
              <span className="font-display text-xl">{t.number}</span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${style.dot}`}
                aria-hidden
              />
              <span className="px-1 text-center text-[10px] uppercase leading-tight text-qahwa-muted">
                {style.label}
              </span>
            </button>
          );
        })}
      </div>

      {checkoutTable && checkoutOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-qahwa-border bg-qahwa-panel p-5 shadow-panel">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl uppercase text-qahwa-text">
                  Table {checkoutTable.number}
                </h2>
                <p className="text-xs text-qahwa-muted">
                  Commande {checkoutOrder.order_number}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCheckout}
                className="h-8 w-8 rounded-full border border-qahwa-border font-display text-qahwa-muted hover:text-qahwa-orange"
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
              {checkoutItems.map((i) => (
                <li key={i.id} className="flex justify-between">
                  <span>
                    {i.quantity} x {i.product_name}
                  </span>
                  <span>{i.line_total} DA</span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex justify-between rounded-lg border border-qahwa-orange/40 bg-qahwa-orange/10 p-3 font-display text-lg uppercase text-qahwa-text">
              <span>Total</span>
              <span>{total} DA</span>
            </div>

            {checkoutOrder.status === "prete" && (
              <button
                type="button"
                onClick={markServed}
                className="mt-3 w-full rounded-xl border border-cyan-400/60 bg-cyan-400/15 py-3 font-display uppercase text-cyan-300 shadow-panel"
              >
                Marquer servi
              </button>
            )}

            <div className="mt-4">
              <p className="mb-1 text-xs uppercase text-qahwa-muted">
                Montant recu
              </p>
              <input
                inputMode="decimal"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-2 text-lg font-display text-qahwa-text"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {CASH_NOTES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAmountReceived(String(received + n))}
                    className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-1 text-sm font-display text-qahwa-text hover:border-qahwa-orange"
                  >
                    +{n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmountReceived(String(total))}
                  className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-1 text-sm font-display text-qahwa-text hover:border-qahwa-orange"
                >
                  Exact
                </button>
                <button
                  type="button"
                  onClick={() => setAmountReceived("")}
                  className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-1 text-sm font-display text-qahwa-text hover:border-qahwa-orange"
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
                    ? `Monnaie a rendre : ${change} DA`
                    : `Il manque : ${Math.abs(change)} DA`}
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  printTicket(
                    checkoutOrder,
                    checkoutItems,
                    checkoutTable.number
                  )
                }
                className="flex-1 rounded-xl border border-qahwa-border bg-qahwa-panel2 py-3 font-display uppercase text-qahwa-text shadow-panel hover:border-qahwa-orange"
              >
                Imprimer le ticket
              </button>
              <button
                type="button"
                disabled={closing}
                onClick={markPaid}
                className="flex-1 rounded-xl border border-qahwa-orange bg-qahwa-orange py-3 font-display uppercase text-qahwa-noir shadow-panel disabled:opacity-60"
              >
                Encaisser
              </button>
            </div>
          </div>
        </div>
      )}

      {posTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-qahwa-border bg-qahwa-panel shadow-panel">
            <div className="flex items-center justify-between border-b border-qahwa-border p-4">
              <h2 className="font-display text-xl uppercase text-qahwa-text">
                Nouvelle commande - Table {posTable.number}
              </h2>
              <button
                type="button"
                onClick={closePosMenu}
                className="h-8 w-8 rounded-full border border-qahwa-border font-display text-qahwa-muted hover:text-qahwa-orange"
                aria-label="Fermer"
              >
                X
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex gap-2 overflow-x-auto border-b border-qahwa-border p-3">
                  {posLoadingMenu && (
                    <span className="text-sm text-qahwa-muted">
                      Chargement du menu...
                    </span>
                  )}
                  {posCategories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setPosActiveCategory(c.id)}
                      className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-display uppercase ${
                        posActiveCategory === c.id
                          ? "border-qahwa-orange bg-qahwa-orange text-qahwa-noir"
                          : "border-qahwa-border bg-qahwa-panel2 text-qahwa-muted"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {posActiveProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addToPosCart(p)}
                        className="rounded-xl border border-qahwa-border bg-qahwa-panel2 p-3 text-left shadow-panel hover:border-qahwa-orange/60"
                      >
                        <p className="font-display text-sm uppercase text-qahwa-text">
                          {p.name}
                        </p>
                        <p className="text-xs text-qahwa-muted">
                          {p.price} DA
                        </p>
                      </button>
                    ))}
                    {!posLoadingMenu && posActiveProducts.length === 0 && (
                      <p className="text-sm text-qahwa-muted">
                        Aucun produit dans cette categorie.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex w-72 flex-col border-l border-qahwa-border">
                <div className="flex-1 overflow-y-auto p-3">
                  <p className="mb-2 font-display text-sm uppercase text-qahwa-muted">
                    Panier
                  </p>
                  {posCart.length === 0 && (
                    <p className="text-sm text-qahwa-muted">
                      Touche un produit pour l&apos;ajouter.
                    </p>
                  )}
                  <ul className="space-y-2">
                    {posCart.map((i) => (
                      <li
                        key={i.lineId}
                        className="rounded-lg border border-qahwa-border bg-qahwa-panel2 p-2 text-sm text-qahwa-text"
                      >
                        <div className="flex justify-between">
                          <span className="font-display uppercase">
                            {i.name}
                          </span>
                          <span>{i.price * i.quantity} DA</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              changePosQty(i.lineId, i.quantity - 1)
                            }
                            className="h-6 w-6 rounded-full border border-qahwa-border font-display"
                          >
                            -
                          </button>
                          <span className="w-4 text-center">
                            {i.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              changePosQty(i.lineId, i.quantity + 1)
                            }
                            className="h-6 w-6 rounded-full border border-qahwa-border font-display"
                          >
                            +
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-qahwa-border p-3">
                  <input
                    value={posCustomerName}
                    onChange={(e) => setPosCustomerName(e.target.value)}
                    placeholder="Nom client (optionnel)"
                    className="mb-2 w-full rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-2 text-sm text-qahwa-text placeholder:text-qahwa-muted"
                  />
                  <div className="mb-2 flex justify-between font-display text-lg uppercase text-qahwa-text">
                    <span>Total</span>
                    <span>{posTotal} DA</span>
                  </div>
                  {posError && (
                    <p className="mb-2 text-xs text-red-500">{posError}</p>
                  )}
                  <button
                    type="button"
                    disabled={posSubmitting}
                    onClick={submitPosOrder}
                    className="w-full rounded-xl border border-qahwa-orange bg-qahwa-orange py-3 font-display uppercase text-qahwa-noir shadow-panel disabled:opacity-60"
                  >
                    Valider la commande
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