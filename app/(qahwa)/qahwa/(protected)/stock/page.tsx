"use client";
import Link from 'next/link'
import ProfitChart from "./ProfitChart";
import { useState, useEffect, useCallback } from "react";
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
  "w-full rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-2 text-sm text-qahwa-text placeholder:text-qahwa-muted focus:outline-none focus:ring-2 focus:ring-qahwa-orange";

export default function StockPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [recipeIngredients, setRecipeIngredients] = useState<ProductIngredient[]>([]);
  const [loading, setLoading] = useState(false);

  // Modale Ingrédient
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIng, setEditingIng] = useState<Ingredient | null>(null);
  const [ingForm, setIngForm] = useState({
    name: "",
    quantity_in_stock: 0,
    unit: "g",
    alert_threshold: 100,
    cost_per_unit: 0,
  });

  // Formulaire Recette
  const [addIngId, setAddIngId] = useState("");
  const [addQty, setAddQty] = useState<number>(0);

  const supabase = createSupabaseBrowserClient();

  const loadData = useCallback(async () => {
    const { data: ingData } = await supabase.from("ingredients").select("*").order("name");
    if (ingData) setIngredients(ingData as Ingredient[]);

    const { data: prodData } = await supabase.from("products").select("id, name, price").order("name");
    const formattedProds = (prodData as Product[] | null) ?? [];
    if (formattedProds.length > 0) {
      setProducts(formattedProds);
      setSelectedProductId((prev) => prev || formattedProds[0]?.id || "");
    }
  }, [supabase]);

  const loadRecipe = useCallback(async (productId: string) => {
    if (!productId) return;
    const { data } = await supabase
      .from("product_ingredients")
      .select("*, ingredients(*)")
      .eq("product_id", productId);
    if (data) setRecipeIngredients(data as unknown as ProductIngredient[]);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedProductId) loadRecipe(selectedProductId);
  }, [selectedProductId, loadRecipe]);

  const handleSaveIngredient = async (e: React.FormEvent) => {
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
    setIngForm({ name: "", quantity_in_stock: 0, unit: "g", alert_threshold: 100, cost_per_unit: 0 });
    await loadData();
    setLoading(false);
  };

  const handleDeleteIngredient = async (id: string) => {
    if (confirm("Supprimer cet ingrédient ?")) {
      try {
        await deleteIngredient(id);
        await loadData();
      } catch (err: any) {
        alert("Erreur : " + err.message);
      }
    }
  };

  const handleAddRecipeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !addIngId || addQty <= 0) return;
    try {
      await upsertProductIngredient(selectedProductId, addIngId, addQty);
      setAddQty(0);
      setAddIngId("");
      await loadRecipe(selectedProductId);
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  const handleRemoveRecipeItem = async (ingId: string) => {
    if (!selectedProductId) return;
    try {
      await deleteProductIngredient(selectedProductId, ingId);
      await loadRecipe(selectedProductId);
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  const currentProduct = products.find((p) => p.id === selectedProductId);
  const totalCost = recipeIngredients.reduce((acc, item) => {
    const costUnit = item.ingredients?.cost_per_unit || 0;
    return acc + costUnit * item.quantity_used;
  }, 0);
  const margin = currentProduct ? currentProduct.price - totalCost : 0;

  const chartData = products.map((prod) => {
    const prodIngredients = recipeIngredients.filter(
      (item) => item.product_id === prod.id
    );
    const cost = prodIngredients.reduce((acc, item) => {
      return acc + (item.ingredients?.cost_per_unit || 0) * item.quantity_used;
    }, 0);
    const margin = Math.max(0, prod.price - cost);

    return {
      name: prod.name,
      price: prod.price,
      cost: Number(cost.toFixed(2)),
      margin: Number(margin.toFixed(2)),
    };
  });

  return (
    <div className="space-y-10 p-6 text-qahwa-text">
      {/* SECTION STOCK */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl uppercase text-qahwa-text">Stock & Coût des Ingrédients</h1>
            <p className="text-xs text-qahwa-muted">Gérez vos matières premières et coûts</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/qahwa/stock/fournisseurs"
              className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-4 py-2 font-display text-xs uppercase text-qahwa-text shadow-panel hover:border-qahwa-orange hover:text-qahwa-orange transition"
            >
              Fournisseurs
            </Link>
            <button
              onClick={() => {
                setEditingIng(null);
                setIngForm({ name: "", quantity_in_stock: 0, unit: "g", alert_threshold: 100, cost_per_unit: 0 });
                setIsModalOpen(true);
              }}
              className="rounded-lg border border-qahwa-orange bg-qahwa-orange px-4 py-2 font-display text-xs uppercase text-qahwa-noir shadow-panel hover:bg-qahwa-orange/90"
            >
              + Ajouter un ingrédient
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-qahwa-border bg-qahwa-panel shadow-panel">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-qahwa-border bg-qahwa-panel2 text-xs font-display uppercase text-qahwa-muted">
              <tr>
                <th className="px-4 py-3">Ingrédient</th>
                <th className="px-4 py-3">En Stock</th>
                <th className="px-4 py-3">Unité</th>
                <th className="px-4 py-3">Coût / Unité (DA)</th>
                <th className="px-4 py-3">Seuil</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-qahwa-border">
              {ingredients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-qahwa-muted">
                    Aucun ingrédient enregistré.
                  </td>
                </tr>
              ) : (
                ingredients.map((ing) => {
                  const isLow = ing.quantity_in_stock <= ing.alert_threshold;
                  return (
                    <tr key={ing.id} className="hover:bg-qahwa-panel2/50 transition">
                      <td className="px-4 py-3 font-medium text-qahwa-text">{ing.name}</td>
                      <td className="px-4 py-3">{ing.quantity_in_stock}</td>
                      <td className="px-4 py-3 text-qahwa-muted">{ing.unit}</td>
                      <td className="px-4 py-3 text-qahwa-orange font-mono">{ing.cost_per_unit || 0} DA</td>
                      <td className="px-4 py-3 text-qahwa-muted">{ing.alert_threshold}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-display uppercase ${
                            isLow
                              ? "border border-qahwa-rouge/40 bg-qahwa-rouge/15 text-qahwa-rouge"
                              : "border border-qahwa-green/40 bg-qahwa-green/15 text-qahwa-green"
                          }`}
                        >
                          {isLow ? "Stock Bas" : "OK"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingIng(ing);
                            setIngForm({
                              name: ing.name,
                              quantity_in_stock: ing.quantity_in_stock,
                              unit: ing.unit,
                              alert_threshold: ing.alert_threshold,
                              cost_per_unit: ing.cost_per_unit || 0,
                            });
                            setIsModalOpen(true);
                          }}
                          className="rounded border border-qahwa-border bg-qahwa-panel2 px-2 py-1 text-xs text-qahwa-muted hover:text-qahwa-text"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteIngredient(ing.id)}
                          className="rounded border border-qahwa-rouge/40 bg-qahwa-rouge/10 px-2 py-1 text-xs text-qahwa-rouge"
                        >
                          Suppr.
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION RECETTES */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl uppercase text-qahwa-text">Fiches Recettes & Coût de Revient</h2>
          <p className="text-xs text-qahwa-muted">Calculez le coût par produit et la marge brute</p>
        </div>

        <div className="rounded-xl border border-qahwa-border bg-qahwa-panel p-5 shadow-panel space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="w-full sm:w-72">
              <label className="block text-xs font-display uppercase text-qahwa-muted mb-1">Produit</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className={inputClass}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id} className="bg-qahwa-panel text-qahwa-text">
                    {p.name} ({p.price} DA)
                  </option>
                ))}
              </select>
            </div>

            {currentProduct && (
              <div className="flex gap-4 border border-qahwa-border bg-qahwa-panel2 p-3 rounded-lg text-xs">
                <div>
                  <span className="text-qahwa-muted block">Prix Vente</span>
                  <span className="font-bold text-qahwa-text font-mono text-sm">{currentProduct.price} DA</span>
                </div>
                <div className="border-l border-qahwa-border pl-4">
                  <span className="text-qahwa-muted block">Coût Recette</span>
                  <span className="font-bold text-qahwa-rouge font-mono text-sm">{totalCost.toFixed(2)} DA</span>
                </div>
                <div className="border-l border-qahwa-border pl-4">
                  <span className="text-qahwa-muted block">Marge Brute</span>
                  <span className="font-bold text-qahwa-green font-mono text-sm">{margin.toFixed(2)} DA</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleAddRecipeItem} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-xs font-display uppercase text-qahwa-muted mb-1">Ingrédient</label>
              <select
                value={addIngId}
                onChange={(e) => setAddIngId(e.target.value)}
                className={inputClass}
              >
                <option value="">Choisir un ingrédient...</option>
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id} className="bg-qahwa-panel text-qahwa-text">
                    {ing.name} ({ing.unit}) - {ing.cost_per_unit || 0} DA/{ing.unit}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-display uppercase text-qahwa-muted mb-1">Quantité</label>
              <input
                type="number"
                step="any"
                value={addQty || ""}
                onChange={(e) => setAddQty(Number(e.target.value))}
                placeholder="Ex: 18"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              className="rounded-lg border border-qahwa-orange bg-qahwa-orange px-4 py-2 font-display text-xs uppercase text-qahwa-noir hover:bg-qahwa-orange/90"
            >
              Ajouter
            </button>
          </form>

          <div className="overflow-hidden rounded-lg border border-qahwa-border bg-qahwa-panel2">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-qahwa-border text-xs font-display uppercase text-qahwa-muted">
                <tr>
                  <th className="px-4 py-2.5">Ingrédient</th>
                  <th className="px-4 py-2.5">Quantité / Unité</th>
                  <th className="px-4 py-2.5">Coût unitaire</th>
                  <th className="px-4 py-2.5">Sous-total</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-qahwa-border">
                {recipeIngredients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-xs text-qahwa-muted">
                      Aucun ingrédient configuré.
                    </td>
                  </tr>
                ) : (
                  recipeIngredients.map((item) => {
                    const unitCost = item.ingredients?.cost_per_unit || 0;
                    const subtotal = unitCost * item.quantity_used;
                    return (
                      <tr key={item.ingredient_id} className="hover:bg-qahwa-panel/50">
                        <td className="px-4 py-2.5 font-medium">{item.ingredients?.name ?? "Inconnu"}</td>
                        <td className="px-4 py-2.5">
                          {item.quantity_used} {item.ingredients?.unit}
                        </td>
                        <td className="px-4 py-2.5 text-qahwa-muted font-mono">{unitCost} DA</td>
                        <td className="px-4 py-2.5 text-qahwa-orange font-mono">{subtotal.toFixed(2)} DA</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => handleRemoveRecipeItem(item.ingredient_id)}
                            className="rounded border border-qahwa-rouge/40 bg-qahwa-rouge/10 px-2 py-1 text-xs text-qahwa-rouge"
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
        </div>
      </section>

      {/* SECTION GRAPHIQUE ANALYSE DE RENTABILITÉ (TOUT EN BAS) */}
      <section className="space-y-4">
        <div className="rounded-xl border border-qahwa-border bg-qahwa-panel p-5 shadow-panel">
          <h2 className="text-lg font-bold text-white mb-1">
            Analyse de Rentabilité
          </h2>
          <p className="text-xs text-qahwa-muted mb-4">
            Rouge = Coût des ingrédients | Vert = Bénéfice (Marge)
          </p>
          <ProfitChart data={chartData} />
        </div>
      </section>

      {/* MODALE INGRÉDIENT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-qahwa-border bg-qahwa-panel p-6 shadow-2xl space-y-4">
            <h3 className="font-display text-lg uppercase text-qahwa-text">
              {editingIng ? "Modifier l'ingrédient" : "Nouvel ingrédient"}
            </h3>
            <form onSubmit={handleSaveIngredient} className="space-y-4">
              <div>
                <label className="block text-xs font-display uppercase text-qahwa-muted mb-1">Nom</label>
                <input
                  required
                  type="text"
                  value={ingForm.name}
                  onChange={(e) => setIngForm({ ...ingForm, name: e.target.value })}
                  placeholder="Ex: Grain Café Blend"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-display uppercase text-qahwa-muted mb-1">Quantité</label>
                  <input
                    required
                    type="number"
                    step="any"
                    value={ingForm.quantity_in_stock}
                    onChange={(e) => setIngForm({ ...ingForm, quantity_in_stock: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-display uppercase text-qahwa-muted mb-1">Unité</label>
                  <select
                    value={ingForm.unit}
                    onChange={(e) => setIngForm({ ...ingForm, unit: e.target.value })}
                    className={inputClass}
                  >
                    <option value="g" className="bg-qahwa-panel">Grammes (g)</option>
                    <option value="ml" className="bg-qahwa-panel">Millilitres (ml)</option>
                    <option value="unite" className="bg-qahwa-panel">Unités</option>
                    <option value="kg" className="bg-qahwa-panel">Kilogrammes (kg)</option>
                    <option value="l" className="bg-qahwa-panel">Litres (l)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-display uppercase text-qahwa-muted mb-1">Coût / Unité (DA)</label>
                  <input
                    required
                    type="number"
                    step="any"
                    value={ingForm.cost_per_unit}
                    onChange={(e) => setIngForm({ ...ingForm, cost_per_unit: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-display uppercase text-qahwa-muted mb-1">Seuil d'alerte</label>
                  <input
                    required
                    type="number"
                    step="any"
                    value={ingForm.alert_threshold}
                    onChange={(e) => setIngForm({ ...ingForm, alert_threshold: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-4 py-2 text-xs font-display uppercase text-qahwa-muted"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg border border-qahwa-orange bg-qahwa-orange px-4 py-2 text-xs font-display uppercase text-qahwa-noir disabled:opacity-50"
                >
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}