import type { Order, OrderItem } from "@/types/database";
import { money } from "./format";

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ENTITIES[char] ?? char);

/** Ouvre une fenêtre d'impression. Retourne false si le navigateur la bloque. */
export function printTicket(order: Order, items: OrderItem[]): boolean {
  const win = window.open("", "_blank", "width=380,height=640");
  if (!win) return false;

  const rows = items
    .map(
      (item) =>
        `<tr><td>${item.quantity} × ${esc(item.product_name)}</td><td style="text-align:right">${money(item.line_total)}</td></tr>`
    )
    .join("");

  win.document.write(`<!doctype html>
<html>
  <head>
    <title>Ticket ${esc(order.order_number)}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: monospace; padding: 16px; width: 280px; }
      h1 { text-align: center; font-size: 22px; }
      .center { text-align: center; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      td { padding: 5px 0; }
      .line { border-top: 1px dashed #000; margin: 10px 0; }
      .total { display: flex; justify-content: space-between; font-weight: bold; }
    </style>
  </head>
  <body>
    <h1>QAHWA</h1>
    <div class="center">
      Commande ${esc(order.order_number)}<br>
      ${esc(order.order_type)}<br>
      ${esc(order.table_number ? `Table ${order.table_number}` : order.customer_name)}<br>
      ${esc(order.customer_phone)}
    </div>
    <div class="line"></div>
    <table>${rows}</table>
    <div class="line"></div>
    <div class="total"><span>Total</span><span>${money(order.total)}</span></div>
    <p class="center">Merci de votre visite</p>
  </body>
</html>`);

  win.document.close();
  win.focus();
  win.print();
  return true;
}