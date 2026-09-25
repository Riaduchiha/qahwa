"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Category, Product } from "@/types/database";

type CategoryWithProducts = Category & { products: Product[] };

const inputClass =
"min-h-11 w-full rounded-xl border border-qahwa-border bg-qahwa-panel2 px-3 py-2 text-sm text-qahwa-text placeholder:text-qahwa-muted outline-none transition focus:border-qahwa-orange focus:ring-1 focus:ring-qahwa-orange/30";

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


await (supabase.from("products") as any)
  .update(patch)
  .eq("id", id);


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

const { data } = supabase.storage
  .from("products")
  .getPublicUrl(path);

await updateProduct(productId, {
  image_url: data.publicUrl,
});

load();


}

async function deleteProduct(id: string) {
if (!confirm("Supprimer ce produit ?")) return;

const supabase = createSupabaseBrowserClient();

await supabase.from("products").delete().eq("id", id);

load();


}

if (loading) {
return ( <div className="rounded-2xl border border-qahwa-border bg-qahwa-panel p-6"> <p className="text-sm text-qahwa-muted">
Chargement du menu... </p> </div>
);
}

return ( <div className="space-y-5">
{/* AJOUT CATEGORIE */} <div className="rounded-2xl border border-qahwa-border bg-qahwa-panel p-4 shadow-panel sm:p-5"> <div className="flex flex-col gap-3 sm:flex-row"> <div className="min-w-0 flex-1"> <p className="font-display text-[10px] uppercase tracking-[0.2em] text-qahwa-orange">
Menu </p>


        <p className="mt-1 text-xs text-qahwa-muted">
          Ajoute une nouvelle catégorie à ton menu.
        </p>
      </div>

      <div className="flex w-full gap-2 sm:max-w-md">
        <input
          placeholder="Nom de la catégorie"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addCategory();
          }}
          className={inputClass}
        />

        <button
          type="button"
          onClick={addCategory}
          className="min-h-11 shrink-0 rounded-xl border border-qahwa-orange bg-qahwa-orange px-4 font-display text-xs uppercase text-qahwa-noir shadow-panel transition hover:bg-qahwa-orange-vif"
        >
          + Ajouter
        </button>
      </div>
    </div>
  </div>

  {/* CATEGORIES */}
  {categories.map((cat) => (
    <section
      key={cat.id}
      className="overflow-hidden rounded-2xl border border-qahwa-border bg-qahwa-panel shadow-panel"
    >
      {/* CATEGORY HEADER */}
      <div className="border-b border-qahwa-border bg-qahwa-panel px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-qahwa-orange/10 font-display text-sm text-qahwa-orange">
                {cat.products.length}
              </div>

              <div className="min-w-0">
                <h2 className="truncate font-display text-base uppercase text-qahwa-text sm:text-lg">
                  {cat.name}
                </h2>

                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-qahwa-muted">
                  {cat.products.length} produit
                  {cat.products.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => toggleCategoryActive(cat)}
              className={`min-h-9 rounded-xl border px-3 text-[10px] font-display uppercase transition ${
                cat.is_active
                  ? "border-qahwa-green/30 bg-qahwa-green/10 text-qahwa-green hover:bg-qahwa-green/15"
                  : "border-qahwa-border bg-qahwa-panel2 text-qahwa-muted hover:text-qahwa-text"
              }`}
            >
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
              {cat.is_active ? "Active" : "Masquée"}
            </button>

            <button
              type="button"
              onClick={() => deleteCategory(cat.id)}
              className="min-h-9 rounded-xl border border-qahwa-rouge/30 bg-qahwa-rouge/10 px-3 text-[10px] font-display uppercase text-qahwa-rouge transition hover:bg-qahwa-rouge/15"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>

      {/* PRODUCTS */}
      <div className="p-3 sm:p-5">
        {cat.products.length === 0 && (
          <div className="rounded-xl border border-dashed border-qahwa-border bg-qahwa-bg/40 px-4 py-8 text-center">
            <p className="font-display text-xs uppercase text-qahwa-muted">
              Aucun produit
            </p>

            <p className="mt-1 text-[11px] text-qahwa-muted">
              Ajoute ton premier produit dans cette catégorie.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {cat.products.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-qahwa-border bg-qahwa-bg/40 p-3 transition hover:border-qahwa-border/80 sm:p-4"
            >
              {/* PRODUCT TOP */}
              <div className="flex items-start gap-3">
                <label className="group relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-qahwa-border bg-qahwa-panel2 sm:h-20 sm:w-20">
                  {p.image_url ? (
                    <Image
                      src={p.image_url}
                      alt={p.name}
                      fill
                      sizes="80px"
                      className="object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="text-lg text-qahwa-muted">
                        +
                      </div>
                      <span className="text-[8px] uppercase text-qahwa-muted">
                        Photo
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[9px] font-display uppercase text-white opacity-0 transition group-hover:opacity-100">
                    Modifier
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];

                      if (file) {
                        uploadPhoto(p.id, file);
                      }
                    }}
                  />
                </label>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-[9px] uppercase tracking-wider text-qahwa-muted">
                        Produit
                      </p>

                      <input
                        defaultValue={p.name}
                        onBlur={(e) =>
                          updateProduct(p.id, {
                            name: e.target.value,
                          })
                        }
                        className={`${inputClass} font-display uppercase`}
                        placeholder="Nom du produit"
                      />
                    </div>

                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          updateProduct(p.id, {
                            is_available: !p.is_available,
                          })
                        }
                        className={`min-h-9 rounded-xl border px-3 text-[10px] font-display uppercase transition ${
                          p.is_available
                            ? "border-qahwa-green/30 bg-qahwa-green/10 text-qahwa-green"
                            : "border-qahwa-border bg-qahwa-panel2 text-qahwa-muted"
                        }`}
                      >
                        {p.is_available
                          ? "Disponible"
                          : "Masqué"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* PRODUCT FIELDS */}
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[9px] uppercase tracking-wider text-qahwa-muted">
                    Description
                  </label>

                  <input
                    defaultValue={p.description ?? ""}
                    onBlur={(e) =>
                      updateProduct(p.id, {
                        description:
                          e.target.value || null,
                      })
                    }
                    className={inputClass}
                    placeholder="Description"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[9px] uppercase tracking-wider text-qahwa-muted">
                    Prix
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      defaultValue={p.price}
                      onBlur={(e) =>
                        updateProduct(p.id, {
                          price:
                            Number(e.target.value) || 0,
                        })
                      }
                      className={`${inputClass} pr-12`}
                      placeholder="Prix"
                    />

                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-display text-qahwa-muted">
                      DA
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[9px] uppercase tracking-wider text-qahwa-muted">
                    Poste
                  </label>

                  <select
                    defaultValue={p.station || "barista"}
                    onChange={(e) =>
                      updateProduct(p.id, {
                        station:
                          e.target.value as Product["station"],
                      })
                    }
                    className={inputClass}
                  >
                    <option value="barista">Barista</option>
                    <option value="bar">Bar</option>
                    <option value="cuisine">Cuisine</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[9px] uppercase tracking-wider text-qahwa-muted">
                    Actions
                  </label>

                  <button
                    type="button"
                    onClick={() => deleteProduct(p.id)}
                    className="min-h-11 w-full rounded-xl border border-qahwa-rouge/30 bg-qahwa-rouge/10 px-3 font-display text-[10px] uppercase text-qahwa-rouge transition hover:bg-qahwa-rouge/15"
                  >
                    Supprimer le produit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ADD PRODUCT */}
        <button
          type="button"
          onClick={() => addProduct(cat.id)}
          className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl border border-dashed border-qahwa-border bg-qahwa-panel2 px-4 font-display text-xs uppercase text-qahwa-muted transition hover:border-qahwa-orange hover:bg-qahwa-orange/5 hover:text-qahwa-orange"
        >
          + Ajouter un produit
        </button>
      </div>
    </section>
  ))}
</div>

);
}
