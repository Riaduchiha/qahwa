"use client";

import { useEffect, useRef, useState } from "react";
import type { Order, OrderItem, Station } from "@/types/database";

const STATIONS: { value: Station | "tous"; label: string }[] = [
{ value: "tous", label: "Tous" },
{ value: "barista", label: "Barista" },
{ value: "bar", label: "Bar" },
{ value: "cuisine", label: "Cuisine" },
];

type OrderWithItems = Order & {
order_items: OrderItem[];
};

function elapsedLabel(createdAt: string) {
const minutes = Math.floor(
(Date.now() - new Date(createdAt).getTime()) / 60000
);

if (minutes < 1) return "A l'instant";

return `il y a ${minutes} min`;
}

export default function KdsPage() {
const [orders, setOrders] = useState<OrderWithItems[]>([]);
const [station, setStation] = useState<Station | "tous">("tous");
const [tick, setTick] = useState(0);
const audioRef = useRef<HTMLAudioElement | null>(null);

async function loadOrders() {
try {
const response = await fetch("/api/poste/kds-data", {
cache: "no-store",
});

  if (!response.ok) {
    console.error("KDS API:", await response.text());
    return;
  }

  const data = await response.json();

  setOrders(data);
} catch (error) {
  console.error("KDS:", error);
}


}

useEffect(() => {
loadOrders();


const interval = setInterval(loadOrders, 2000);

return () => clearInterval(interval);


}, []);

useEffect(() => {
const interval = setInterval(() => {
setTick((value) => value + 1);
}, 30000);


return () => clearInterval(interval);

}, []);

async function markReady(item: OrderItem) {
try {
const response = await fetch("/api/poste/mark-ready", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
item_id: item.id,
}),
});


  const result = await response.json();

  if (!response.ok) {
    alert(result.error ?? "Erreur.");
    return;
  }

  await loadOrders();
} catch (error) {
  console.error("Mark ready:", error);
  alert("Erreur lors de la validation.");
}

}

const filteredOrders = orders
.map((order) => ({
...order,
station_items:
station === "tous"
? order.order_items
: order.order_items.filter(
(item) => item.station === station
),
}))
.filter((order) => order.station_items.length > 0);

void tick;

return ( <div className="min-h-screen bg-qahwa-bg p-4"> <audio
     ref={audioRef}
     src="/notification.mp3"
     preload="auto"
   />


  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
    <h1 className="font-display text-2xl text-qahwa-text">
      {station === "bar"
        ? "Bar Display"
        : station === "cuisine"
          ? "Cuisine Display"
          : station === "barista"
            ? "Barista Display"
            : "Barista Display"}
    </h1>

    <div className="flex gap-2">
      {STATIONS.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => setStation(item.value)}
          className={`rounded-lg px-4 py-2 text-sm font-display uppercase ${
            station === item.value
              ? "border border-qahwa-orange bg-qahwa-orange text-qahwa-noir"
              : "border border-qahwa-border bg-qahwa-panel2 text-qahwa-muted"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  </div>

  {filteredOrders.length === 0 ? (
    <p className="mt-20 text-center text-qahwa-muted">
      Aucune commande en cours.
    </p>
  ) : (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {filteredOrders.map((order) => (
        <div
          key={order.id}
          className="rounded-qahwa border border-qahwa-border bg-qahwa-panel p-4 shadow-panel"
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-2xl text-qahwa-text">
              {order.table_number
                ? `Table ${order.table_number}`
                : order.order_number}
            </span>

            <span className="text-sm text-qahwa-muted">
              {elapsedLabel(order.created_at)}
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {order.station_items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-base text-qahwa-text">
                  {item.quantity} x {item.product_name}
                </span>

                {item.status === "ready" ? (
                  <span className="rounded-lg border border-qahwa-green/40 bg-qahwa-green/15 px-4 py-2 text-sm font-display text-qahwa-green">
                    Pret
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => markReady(item)}
                    className="rounded-lg bg-qahwa-green px-5 py-2.5 text-sm font-display text-qahwa-noir active:scale-95"
                  >
                    Marquer pret
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )}
</div>


);
}
