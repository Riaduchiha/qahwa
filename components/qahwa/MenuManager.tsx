"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Category, Product } from "@/types/database";

type CategoryWithProducts = Category & { products: Product[] };

const inputClass =
  "rounded-lg border border-qahwa-border bg-qahwa-panel2 px-2 py-1.5 text-sm text-qahwa-text placeholder:text-qahwa-muted focus:outline-none focus:ring-2 focus:ring-qahwa-orange";

export default function MenuManager() {
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState("");

  async function load() {
    const supabase = createSupabaseBrowserClient();
    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .order("display_order");
    const { data: prods } = await supabase
      .from("products")
      .select("*, product_option_groups(*, product_options(*))")
      .order("display_order");

    const categoriesData = (cats as Category[] | null) ?? [];
    const productsData = (prods as Product[] | null) ?? [];

    setCategories(
      categoriesData.map((c) => ({
        ...c,
        products: productsData.filter((p) => p.category_id === c.id),
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    const supabase = createSupabaseBrowserClient();
    const slug = newCategoryName
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    await (supabase.from("categories") as any).insert({
      name: newCategoryName.trim(),
      slug,
      display_order: categories.length + 1,
    });
    setNewCategoryName("");
    load();
  }

  async function toggleCategoryActive(cat: Category) {
    const supabase = createSupabaseBrowserClient();
    await (supabase.from("categories") as any)
      .update({ is_active: !cat.is_active })
      .eq("id", cat.id);
    load();
  }

  async function deleteCategory(id: string) {
    if (!confirm("Supprimer cette categorie et tous ses produits ?")) return;
    const supabase = createSupabaseBrowserClient();
    await supabase.from("categories").delete().eq("id", id);
    load();
  }

  async function addProduct(categoryId: string) {
    const supabase = createSupabaseBrowserClient();
    await (supabase.from("products") as any).insert({
      category_id: categoryId,
      name: "Nouveau produit",
      price: 0,
      is_available: true,
      display_order: 0,
      station: "barista",
    });
    load();
  }

  async function updateProduct(id: string, patch: Partial<Product>) {
    const supabase = createSupabaseBrowserClient();
    await (supabase.from("products") as any).update(patch).eq("id", id);
  }

  async function uploadPhoto(productId: string, file: File) {
    const supabase = createSupabaseBrowserClient();
    const ext = file.name.split(".").pop();
    const path = `${productId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("products")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      alert("Erreur lors de l'envoi de la photo : " + uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("products").getPublicUrl(path);
    await updateProduct(productId, { image_url: data.publicUrl });
    load();
  }

  async function deleteProduct(id: string) {
    if (!confirm("Supprimer ce produit ?")) return;
    const supabase = createSupabaseBrowserClient();
    await supabase.from("products").delete().eq("id", id);
    load();
  }

  if (loading) {
    return <p className="text-sm text-qahwa-muted">Chargement...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex gap-2">
        <input
          placeholder="Nom de la nouvelle categorie"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          className={inputClass}
        />
        <button
          onClick={addCategory}
          className="rounded-lg border border-qahwa-orange bg-qahwa-orange px-4 py-1.5 text-sm font-display uppercase text-qahwa-noir shadow-panel"
        >
          + Categorie
        </button>
      </div>

      {categories.map((cat) => (
        <div
          key={cat.id}
          className="rounded-xl border border-qahwa-border bg-qahwa-panel p-4 shadow-panel"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg uppercase text-qahwa-text">
              {cat.name}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleCategoryActive(cat)}
                className={`rounded-full border px-3 py-1 text-xs font-display uppercase ${
                  cat.is_active
                    ? "border-qahwa-green/40 bg-qahwa-green/15 text-qahwa-green"
                    : "border-qahwa-border bg-qahwa-panel2 text-qahwa-muted"
                }`}
              >
                {cat.is_active ? "Active" : "Masquee"}
              </button>
              <button
                onClick={() => deleteCategory(cat.id)}
                className="rounded-full border border-qahwa-rouge bg-qahwa-rouge/15 px-3 py-1 text-xs font-display uppercase text-qahwa-rouge"
              >
                Suppr.
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {cat.products.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-1 gap-2 rounded-lg border border-qahwa-border p-3 sm:grid-cols-[56px_2fr_1fr_1fr_1fr_auto_auto]"             >
                <label className="relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-qahwa-border bg-qahwa-panel2">
                  {p.image_url ? (
                    <Image
                      src={p.image_url}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-[9px] uppercase text-qahwa-muted">
                      Photo
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadPhoto(p.id, file);
                    }}
                  />
                </label>
                <input
                  defaultValue={p.name}
                  onBlur={(e) => updateProduct(p.id, { name: e.target.value })}
                  className={inputClass}
                  placeholder="Nom"
                />
                <input
                  defaultValue={p.description ?? ""}
                  onBlur={(e) =>
                    updateProduct(p.id, { description: e.target.value || null })
                  }
                  className={inputClass}
                  placeholder="Description"
                />
                <input
  type="number"
  defaultValue={p.price}
  onBlur={(e) =>
    updateProduct(p.id, { price: Number(e.target.value) || 0 })
  }
  className={inputClass}
  placeholder="Prix (DA)"
/>
<select
  defaultValue={p.station || "barista"}
  onChange={(e) =>
    updateProduct(p.id, { station: e.target.value as Product["station"] })
  }
  className={inputClass}
>
  <option value="barista">Barista</option>
  <option value="bar">Bar</option>
  <option value="cuisine">Cuisine</option>
</select>
                <button
                  onClick={() =>
                    updateProduct(p.id, { is_available: !p.is_available })
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-display uppercase ${
                    p.is_available
                      ? "border-qahwa-green/40 bg-qahwa-green/15 text-qahwa-green"
                      : "border-qahwa-border bg-qahwa-panel2 text-qahwa-muted"
                  }`}
                >
                  {p.is_available ? "Dispo" : "Masque"}
                </button>
                <button
                  onClick={() => deleteProduct(p.id)}
                  className="rounded-full border border-qahwa-rouge bg-qahwa-rouge/15 px-3 py-1 text-xs font-display uppercase text-qahwa-rouge"
                >
                  Suppr.
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => addProduct(cat.id)}
            className="mt-3 rounded-lg border border-qahwa-border bg-qahwa-panel2 px-4 py-1.5 text-xs font-display uppercase text-qahwa-text shadow-panel hover:border-qahwa-orange"
          >
            + Produit
          </button>
        </div>
      ))}
    </div>
  );
}