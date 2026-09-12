"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ProductProfit {
  name: string;
  price: number;
  cost: number;
  margin: number;
}

export default function ProfitChart({ data }: { data: ProductProfit[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-qahwa-muted">
        Aucune donnée de recette disponible pour le graphique.
      </div>
    );
  }

  return (
    <div className="h-64 w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
          <XAxis
            dataKey="name"
            stroke="#888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            unit=" DA"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              borderColor: "#27272a",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "12px",
            }}
            formatter={(value: any, name: any) => [
              `${value} DA`,
              name === "cost" ? "Coût" : name === "margin" ? "Marge Brute" : "Prix Vente",
            ]}
          />
          <Bar dataKey="cost" name="cost" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
          <Bar dataKey="margin" name="margin" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.margin > 0 ? "#22c55e" : "#eab308"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}