"use client";

import Link from "next/link";
import ProfitChart from "./ProfitChart";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
createIngredient,
updateIngredient,
deleteIngredient,
upsertProductIngredient,
deleteProductIngredient,
} from "./actions";

interface Ingredient {
id: string;
name: string;
quantity_in_stock: number;
unit: string;
alert_threshold: number;
cost_per_unit: number;
}

interface Product {
id: string;
name: string;
price: number;
}

interface ProductIngredient {
product_id: string;
ingredient_id: string;
quantity_used: number;
ingredients?: Ingredient;
}

const inputClass =
"min-h-11 w-full rounded-xl border border-qahwa-border bg-qahwa-panel2 px-3 py-2 text-sm text-qahwa-text placeholder:text-qahwa-muted outline-none transition focus:border-qahwa-orange focus:ring-1 focus:ring-qahwa-orange/30";

export default function StockPage() {
const [ingredients, setIngredients] = useState<Ingredient[]>([]);
const [products, setProducts] = useState<Product[]>([]);
const [selectedProductId, setSelectedProductId] = useState<string>("");
const [recipeIngredients, setRecipeIngredients] = useState<
ProductIngredient[]

> ([]);
 const [loading, setLoading] = useState(false);

const [isModalOpen, setIsModalOpen] = useState(false);
const [editingIng, setEditingIng] = useState<Ingredient | null>(null);

const [ingForm, setIngForm] = useState({
name: "",
quantity_in_stock: 0,
unit: "g",
alert_threshold: 100,
cost_per_unit: 0,
});

const [addIngId, setAddIngId] = useState("");
const [addQty, setAddQty] = useState<number>(0);

const supabase = useMemo(
() => createSupabaseBrowserClient(),
[]
);

const loadData = useCallback(async () => {
const { data: ingData } = await supabase
.from("ingredients")
.select("*")
.order("name");


if (ingData) {
  setIngredients(ingData as Ingredient[]);
}

const { data: prodData } = await supabase
  .from("products")
  .select("id, name, price")
  .order("name");

const formattedProds = (prodData as Product[] | null) ?? [];

if (formattedProds.length > 0) {
  setProducts(formattedProds);

  setSelectedProductId(
    (prev) => prev || formattedProds[0]?.id || ""
  );
} else {
  setProducts([]);
  setSelectedProductId("");
}


}, [supabase]);

const loadRecipe = useCallback(
async (productId: string) => {
if (!productId) {
setRecipeIngredients([]);
return;
}


  const { data } = await supabase
    .from("product_ingredients")
    .select("*, ingredients(*)")
    .eq("product_id", productId);

  if (data) {
    setRecipeIngredients(
      data as unknown as ProductIngredient[]
    );
  } else {
    setRecipeIngredients([]);
  }
},
[supabase]


);

useEffect(() => {
loadData();


const channel = supabase
  .channel("stock-live")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "ingredients",
    },
    () => loadData()
  )
  .subscribe();

return () => {
  supabase.removeChannel(channel);
};

// eslint-disable-next-line react-hooks/exhaustive-deps


}, []);

useEffect(() => {
if (selectedProductId) {
loadRecipe(selectedProductId);
}
}, [selectedProductId, loadRecipe]);

const handleSaveIngredient = async (
e: React.FormEvent
) => {
e.preventDefault();
setLoading(true);


let res;

if (editingIng) {
  res = await updateIngredient(editingIng.id, ingForm);
} else {
  res = await createIngredient(ingForm);
}

if (res && !res.success) {
  alert("Erreur détectée : " + res.error);
  setLoading(false);
  return;
}

setIsModalOpen(false);
setEditingIng(null);

setIngForm({
  name: "",
  quantity_in_stock: 0,
  unit: "g",
  alert_threshold: 100,
  cost_per_unit: 0,
});

await loadData();
setLoading(false);


};

const handleDeleteIngredient = async (id: string) => {
if (!confirm("Supprimer cet ingrédient ?")) return;


try {
  await deleteIngredient(id);
  await loadData();
} catch (err: any) {
  alert("Erreur : " + err.message);
}


};

const handleAddRecipeItem = async (
e: React.FormEvent
) => {
e.preventDefault();

if (
  !selectedProductId ||
  !addIngId ||
  addQty <= 0
) {
  return;
}

try {
  await upsertProductIngredient(
    selectedProductId,
    addIngId,
    addQty
  );

  setAddQty(0);
  setAddIngId("");

  await loadRecipe(selectedProductId);
} catch (err: any) {
  alert("Erreur : " + err.message);
}


};

const handleRemoveRecipeItem = async (
ingId: string
) => {
if (!selectedProductId) return;

try {
  await deleteProductIngredient(
    selectedProductId,
    ingId
  );

  await loadRecipe(selectedProductId);
} catch (err: any) {
  alert("Erreur : " + err.message);
}


};

const currentProduct = products.find(
(p) => p.id === selectedProductId
);

const totalCost = recipeIngredients.reduce(
(acc, item) => {
const costUnit =
item.ingredients?.cost_per_unit || 0;


  return acc + costUnit * item.quantity_used;
},
0


);

const margin = currentProduct
? currentProduct.price - totalCost
: 0;

const chartData = products.map((prod) => {
const prodIngredients =
prod.id === selectedProductId
? recipeIngredients
: [];


const cost = prodIngredients.reduce(
  (acc, item) => {
    return (
      acc +
      (item.ingredients?.cost_per_unit || 0) *
        item.quantity_used
    );
  },
  0
);

const margin = Math.max(0, prod.price - cost);

return {
  name: prod.name,
  price: prod.price,
  cost: Number(cost.toFixed(2)),
  margin: Number(margin.toFixed(2)),
};

});

function openAddIngredient() {
setEditingIng(null);


setIngForm({
  name: "",
  quantity_in_stock: 0,
  unit: "g",
  alert_threshold: 100,
  cost_per_unit: 0,
});

setIsModalOpen(true);


}

function openEditIngredient(ing: Ingredient) {
setEditingIng(ing);


setIngForm({
  name: ing.name,
  quantity_in_stock: ing.quantity_in_stock,
  unit: ing.unit,
  alert_threshold: ing.alert_threshold,
  cost_per_unit: ing.cost_per_unit || 0,
});

setIsModalOpen(true);


}

return ( <div className="w-full space-y-6 text-qahwa-text sm:space-y-8">
{/* HEADER */} <section> <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"> <div> <p className="font-display text-[10px] uppercase tracking-[0.25em] text-qahwa-orange">
Gestion </p>


        <h1 className="mt-1 font-display text-2xl uppercase tracking-tight text-qahwa-text sm:text-3xl">
          Stock
        </h1>

        <p className="mt-1 max-w-xl text-xs leading-5 text-qahwa-muted sm:text-sm">
          Gérez vos ingrédients, vos niveaux de stock et
          le coût réel de vos produits.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Link
          href="/qahwa/stock/fournisseurs"
          className="flex min-h-11 items-center justify-center rounded-xl border border-qahwa-border bg-qahwa-panel2 px-4 font-display text-[10px] uppercase text-qahwa-text transition hover:border-qahwa-orange hover:text-qahwa-orange"
        >
          Fournisseurs
        </Link>

        <button
          type="button"
          onClick={openAddIngredient}
          className="min-h-11 rounded-xl border border-qahwa-orange bg-qahwa-orange px-4 font-display text-[10px] uppercase text-qahwa-noir shadow-panel transition hover:bg-qahwa-orange-vif"
        >
          + Ingrédient
        </button>
      </div>
    </div>
  </section>

  {/* STOCK */}
  <section>
    <div className="mb-3 flex items-end justify-between">
      <div>
        <h2 className="font-display text-lg uppercase text-qahwa-text sm:text-xl">
          Ingrédients
        </h2>

        <p className="mt-1 text-[11px] text-qahwa-muted">
          {ingredients.length} ingrédient
          {ingredients.length !== 1 ? "s" : ""} enregistré
          {ingredients.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>

    {/* DESKTOP TABLE */}
    <div className="hidden overflow-hidden rounded-2xl border border-qahwa-border bg-qahwa-panel shadow-panel md:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="border-b border-qahwa-border bg-qahwa-panel2 text-[10px] font-display uppercase tracking-wider text-qahwa-muted">
            <tr>
              <th className="px-4 py-3">Ingrédient</th>
              <th className="px-4 py-3">En stock</th>
              <th className="px-4 py-3">Unité</th>
              <th className="px-4 py-3">Coût / unité</th>
              <th className="px-4 py-3">Seuil</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-qahwa-border">
            {ingredients.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-qahwa-muted"
                >
                  Aucun ingrédient enregistré.
                </td>
              </tr>
            ) : (
              ingredients.map((ing) => {
                const isLow =
                  ing.quantity_in_stock <=
                  ing.alert_threshold;

                return (
                  <tr
                    key={ing.id}
                    className="transition hover:bg-qahwa-panel2/40"
                  >
                    <td className="px-4 py-4">
                      <span className="font-display text-sm text-qahwa-text">
                        {ing.name}
                      </span>
                    </td>

                    <td className="px-4 py-4 font-mono text-sm">
                      {ing.quantity_in_stock}
                    </td>

                    <td className="px-4 py-4 text-qahwa-muted">
                      {ing.unit}
                    </td>

                    <td className="px-4 py-4 font-mono text-sm text-qahwa-orange">
                      {ing.cost_per_unit || 0} DA
                    </td>

                    <td className="px-4 py-4 text-qahwa-muted">
                      {ing.alert_threshold}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-lg border px-2.5 py-1 text-[9px] font-display uppercase ${
                          isLow
                            ? "border-qahwa-rouge/30 bg-qahwa-rouge/10 text-qahwa-rouge"
                            : "border-qahwa-green/30 bg-qahwa-green/10 text-qahwa-green"
                        }`}
                      >
                        {isLow ? "Stock bas" : "OK"}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEditIngredient(ing)
                          }
                          className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-2 text-[10px] font-display uppercase text-qahwa-muted transition hover:border-qahwa-orange hover:text-qahwa-text"
                        >
                          Modifier
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteIngredient(
                              ing.id
                            )
                          }
                          className="rounded-lg border border-qahwa-rouge/30 bg-qahwa-rouge/10 px-3 py-2 text-[10px] font-display uppercase text-qahwa-rouge transition hover:bg-qahwa-rouge/15"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* MOBILE CARDS */}
    <div className="space-y-3 md:hidden">
      {ingredients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-qahwa-border bg-qahwa-panel px-4 py-10 text-center">
          <p className="font-display text-xs uppercase text-qahwa-muted">
            Aucun ingrédient
          </p>

          <p className="mt-1 text-[11px] text-qahwa-muted">
            Ajoutez votre premier ingrédient.
          </p>
        </div>
      ) : (
        ingredients.map((ing) => {
          const isLow =
            ing.quantity_in_stock <=
            ing.alert_threshold;

          return (
            <div
              key={ing.id}
              className="rounded-2xl border border-qahwa-border bg-qahwa-panel p-4 shadow-panel"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-sm uppercase text-qahwa-text">
                    {ing.name}
                  </p>

                  <p className="mt-1 text-[10px] uppercase tracking-wider text-qahwa-muted">
                    Ingrédient
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-lg border px-2 py-1 text-[9px] font-display uppercase ${
                    isLow
                      ? "border-qahwa-rouge/30 bg-qahwa-rouge/10 text-qahwa-rouge"
                      : "border-qahwa-green/30 bg-qahwa-green/10 text-qahwa-green"
                  }`}
                >
                  {isLow ? "Stock bas" : "OK"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-qahwa-panel2 p-3">
                  <p className="text-[9px] uppercase text-qahwa-muted">
                    En stock
                  </p>

                  <p className="mt-1 font-mono text-sm text-qahwa-text">
                    {ing.quantity_in_stock} {ing.unit}
                  </p>
                </div>

                <div className="rounded-xl bg-qahwa-panel2 p-3">
                  <p className="text-[9px] uppercase text-qahwa-muted">
                    Coût / unité
                  </p>

                  <p className="mt-1 font-mono text-sm text-qahwa-orange">
                    {ing.cost_per_unit || 0} DA
                  </p>
                </div>

                <div className="rounded-xl bg-qahwa-panel2 p-3">
                  <p className="text-[9px] uppercase text-qahwa-muted">
                    Seuil
                  </p>

                  <p className="mt-1 font-mono text-sm text-qahwa-text">
                    {ing.alert_threshold} {ing.unit}
                  </p>
                </div>

                <div className="rounded-xl bg-qahwa-panel2 p-3">
                  <p className="text-[9px] uppercase text-qahwa-muted">
                    Unité
                  </p>

                  <p className="mt-1 font-mono text-sm uppercase text-qahwa-text">
                    {ing.unit}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    openEditIngredient(ing)
                  }
                  className="min-h-11 rounded-xl border border-qahwa-border bg-qahwa-panel2 px-3 font-display text-[10px] uppercase text-qahwa-text"
                >
                  Modifier
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDeleteIngredient(ing.id)
                  }
                  className="min-h-11 rounded-xl border border-qahwa-rouge/30 bg-qahwa-rouge/10 px-3 font-display text-[10px] uppercase text-qahwa-rouge"
                >
                  Supprimer
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  </section>

  {/* RECETTES */}
  <section>
    <div className="mb-3">
      <h2 className="font-display text-lg uppercase text-qahwa-text sm:text-xl">
        Fiches recettes
      </h2>

      <p className="mt-1 text-[11px] text-qahwa-muted sm:text-xs">
        Calculez le coût de revient et la marge de chaque produit.
      </p>
    </div>

    <div className="rounded-2xl border border-qahwa-border bg-qahwa-panel p-4 shadow-panel sm:p-5">
      {/* PRODUCT SELECT + SUMMARY */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <label className="mb-1.5 block text-[10px] font-display uppercase tracking-wider text-qahwa-muted">
            Produit
          </label>

          <select
            value={selectedProductId}
            onChange={(e) =>
              setSelectedProductId(e.target.value)
            }
            className={inputClass}
          >
            {products.length === 0 && (
              <option value="">
                Aucun produit
              </option>
            )}

            {products.map((p) => (
              <option
                key={p.id}
                value={p.id}
                className="bg-qahwa-panel text-qahwa-text"
              >
                {p.name} — {p.price} DA
              </option>
            ))}
          </select>
        </div>

        {currentProduct && (
          <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-qahwa-border bg-qahwa-panel2">
            <div className="p-3">
              <p className="text-[8px] uppercase text-qahwa-muted">
                Vente
              </p>

              <p className="mt-1 font-mono text-xs text-qahwa-text sm:text-sm">
                {currentProduct.price} DA
              </p>
            </div>

            <div className="border-l border-qahwa-border p-3">
              <p className="text-[8px] uppercase text-qahwa-muted">
                Coût
              </p>

              <p className="mt-1 font-mono text-xs text-qahwa-rouge sm:text-sm">
                {totalCost.toFixed(2)} DA
              </p>
            </div>

            <div className="border-l border-qahwa-border p-3">
              <p className="text-[8px] uppercase text-qahwa-muted">
                Marge
              </p>

              <p className="mt-1 font-mono text-xs text-qahwa-green sm:text-sm">
                {margin.toFixed(2)} DA
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ADD RECIPE */}
      <form
        onSubmit={handleAddRecipeItem}
        className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,2fr)_1fr_auto] sm:items-end"
      >
        <div>
          <label className="mb-1.5 block text-[10px] font-display uppercase tracking-wider text-qahwa-muted">
            Ajouter un ingrédient
          </label>

          <select
            value={addIngId}
            onChange={(e) =>
              setAddIngId(e.target.value)
            }
            className={inputClass}
          >
            <option value="">
              Choisir un ingrédient...
            </option>

            {ingredients.map((ing) => (
              <option
                key={ing.id}
                value={ing.id}
                className="bg-qahwa-panel text-qahwa-text"
              >
                {ing.name} — {ing.cost_per_unit || 0} DA/{ing.unit}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-display uppercase tracking-wider text-qahwa-muted">
            Quantité
          </label>

          <input
            type="number"
            step="any"
            min="0"
            value={addQty || ""}
            onChange={(e) =>
              setAddQty(Number(e.target.value))
            }
            placeholder="Ex : 18"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          className="min-h-11 rounded-xl border border-qahwa-orange bg-qahwa-orange px-5 font-display text-[10px] uppercase text-qahwa-noir transition hover:bg-qahwa-orange-vif"
        >
          + Ajouter
        </button>
      </form>

      {/* RECIPE DESKTOP */}
      <div className="mt-5 hidden overflow-hidden rounded-xl border border-qahwa-border bg-qahwa-panel2 md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-qahwa-border text-[10px] font-display uppercase tracking-wider text-qahwa-muted">
            <tr>
              <th className="px-4 py-3">
                Ingrédient
              </th>

              <th className="px-4 py-3">
                Quantité / unité
              </th>

              <th className="px-4 py-3">
                Coût unitaire
              </th>

              <th className="px-4 py-3">
                Sous-total
              </th>

              <th className="px-4 py-3 text-right">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-qahwa-border">
            {recipeIngredients.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-xs text-qahwa-muted"
                >
                  Aucun ingrédient configuré.
                </td>
              </tr>
            ) : (
              recipeIngredients.map((item) => {
                const unitCost =
                  item.ingredients?.cost_per_unit || 0;

                const subtotal =
                  unitCost * item.quantity_used;

                return (
                  <tr
                    key={item.ingredient_id}
                    className="transition hover:bg-qahwa-panel/50"
                  >
                    <td className="px-4 py-3 font-medium text-qahwa-text">
                      {item.ingredients?.name ??
                        "Inconnu"}
                    </td>

                    <td className="px-4 py-3 font-mono text-xs">
                      {item.quantity_used}{" "}
                      {item.ingredients?.unit}
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-qahwa-muted">
                      {unitCost} DA
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-qahwa-orange">
                      {subtotal.toFixed(2)} DA
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveRecipeItem(
                            item.ingredient_id
                          )
                        }
                        className="rounded-lg border border-qahwa-rouge/30 bg-qahwa-rouge/10 px-3 py-2 text-[10px] font-display uppercase text-qahwa-rouge"
                      >
                        Enlever
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* RECIPE MOBILE */}
      <div className="mt-5 space-y-2 md:hidden">
        {recipeIngredients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-qahwa-border px-4 py-8 text-center">
            <p className="font-display text-xs uppercase text-qahwa-muted">
              Aucun ingrédient
            </p>
          </div>
        ) : (
          recipeIngredients.map((item) => {
            const unitCost =
              item.ingredients?.cost_per_unit || 0;

            const subtotal =
              unitCost * item.quantity_used;

            return (
              <div
                key={item.ingredient_id}
                className="rounded-xl border border-qahwa-border bg-qahwa-panel2 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-xs uppercase text-qahwa-text">
                      {item.ingredients?.name ??
                        "Inconnu"}
                    </p>

                    <p className="mt-1 text-[10px] text-qahwa-muted">
                      {item.quantity_used}{" "}
                      {item.ingredients?.unit}
                    </p>
                  </div>

                  <p className="shrink-0 font-mono text-xs text-qahwa-orange">
                    {subtotal.toFixed(2)} DA
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-qahwa-border pt-3">
                  <span className="text-[10px] text-qahwa-muted">
                    Coût unitaire :{" "}
                    <span className="font-mono text-qahwa-text">
                      {unitCost} DA
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveRecipeItem(
                        item.ingredient_id
                      )
                    }
                    className="min-h-9 rounded-lg border border-qahwa-rouge/30 bg-qahwa-rouge/10 px-3 text-[9px] font-display uppercase text-qahwa-rouge"
                  >
                    Enlever
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  </section>

  {/* RENTABILITE */}
  <section>
    <div className="rounded-2xl border border-qahwa-border bg-qahwa-panel p-4 shadow-panel sm:p-5">
      <div className="mb-5">
        <p className="font-display text-[10px] uppercase tracking-[0.2em] text-qahwa-orange">
          Analyse
        </p>

        <h2 className="mt-1 font-display text-lg uppercase text-qahwa-text sm:text-xl">
          Rentabilité
        </h2>

        <p className="mt-1 text-[11px] leading-5 text-qahwa-muted sm:text-xs">
          Comparaison du coût des ingrédients et de la marge.
        </p>
      </div>

      <div className="overflow-x-auto">
        <ProfitChart data={chartData} />
      </div>
    </div>
  </section>

  {/* MODALE */}
  {isModalOpen && (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-qahwa-border bg-qahwa-panel p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-[10px] uppercase tracking-[0.2em] text-qahwa-orange">
              Stock
            </p>

            <h3 className="mt-1 font-display text-lg uppercase text-qahwa-text">
              {editingIng
                ? "Modifier l'ingrédient"
                : "Nouvel ingrédient"}
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-qahwa-panel2 text-lg text-qahwa-muted transition hover:text-qahwa-text"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSaveIngredient}
          className="mt-5 space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-[10px] font-display uppercase tracking-wider text-qahwa-muted">
              Nom
            </label>

            <input
              required
              type="text"
              value={ingForm.name}
              onChange={(e) =>
                setIngForm({
                  ...ingForm,
                  name: e.target.value,
                })
              }
              placeholder="Ex : Grain Café Blend"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-display uppercase tracking-wider text-qahwa-muted">
                Quantité
              </label>

              <input
                required
                type="number"
                step="any"
                value={ingForm.quantity_in_stock}
                onChange={(e) =>
                  setIngForm({
                    ...ingForm,
                    quantity_in_stock:
                      Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-display uppercase tracking-wider text-qahwa-muted">
                Unité
              </label>

              <select
                value={ingForm.unit}
                onChange={(e) =>
                  setIngForm({
                    ...ingForm,
                    unit: e.target.value,
                  })
                }
                className={inputClass}
              >
                <option
                  value="g"
                  className="bg-qahwa-panel"
                >
                  Grammes (g)
                </option>

                <option
                  value="ml"
                  className="bg-qahwa-panel"
                >
                  Millilitres (ml)
                </option>

                <option
                  value="unite"
                  className="bg-qahwa-panel"
                >
                  Unités
                </option>

                <option
                  value="kg"
                  className="bg-qahwa-panel"
                >
                  Kilogrammes (kg)
                </option>

                <option
                  value="l"
                  className="bg-qahwa-panel"
                >
                  Litres (l)
                </option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-display uppercase tracking-wider text-qahwa-muted">
                Coût / unité
              </label>

              <input
                required
                type="number"
                step="any"
                value={ingForm.cost_per_unit}
                onChange={(e) =>
                  setIngForm({
                    ...ingForm,
                    cost_per_unit:
                      Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-display uppercase tracking-wider text-qahwa-muted">
                Seuil d'alerte
              </label>

              <input
                required
                type="number"
                step="any"
                value={ingForm.alert_threshold}
                onChange={(e) =>
                  setIngForm({
                    ...ingForm,
                    alert_threshold:
                      Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="min-h-11 rounded-xl border border-qahwa-border bg-qahwa-panel2 px-5 font-display text-[10px] uppercase text-qahwa-muted"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading}
              className="min-h-11 rounded-xl border border-qahwa-orange bg-qahwa-orange px-5 font-display text-[10px] uppercase text-qahwa-noir disabled:opacity-50"
            >
              {loading
                ? "Enregistrement..."
                : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )}
</div>


);
}
