"use client";

import { useMemo, useState } from "react";
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
  upsertIngredientSupplier,
  deleteIngredientSupplier,
} from "./actions";

type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
};

type Ingredient = {
  id: string;
  name: string;
  unit: string;
};

type Link = {
  ingredient_id: string;
  supplier_id: string;
  price: number;
};

const inputClass =
  "w-full rounded-xl border border-qahwa-border bg-qahwa-panel2 px-3 py-2.5 text-sm text-qahwa-text placeholder:text-qahwa-muted outline-none transition focus:border-qahwa-orange focus:ring-2 focus:ring-qahwa-orange/20";

export default function SuppliersManager({
  initialSuppliers,
  ingredients,
  initialLinks,
}: {
  initialSuppliers: Supplier[];
  ingredients: Ingredient[];
  initialLinks: Link[];
}) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [links, setLinks] = useState(initialLinks);

  const [selectedIngredient, setSelectedIngredient] = useState(
    ingredients[0]?.id ?? ""
  );

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] =
    useState<Supplier | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
  });

  function openAddModal() {
    setEditingSupplier(null);
    setForm({
      name: "",
      phone: "",
      address: "",
    });
    setIsModalOpen(true);
  }

  function openEditModal(supplier: Supplier) {
    setEditingSupplier(supplier);

    setForm({
      name: supplier.name,
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
    });

    setIsModalOpen(true);
  }

  async function handleSaveModal(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) return;

    if (editingSupplier) {
      await updateSupplier(editingSupplier.id, form);

      setSuppliers((prev) =>
        prev.map((supplier) =>
          supplier.id === editingSupplier.id
            ? {
                ...supplier,
                ...form,
              }
            : supplier
        )
      );
    } else {
      await createSupplier(form);
      window.location.reload();
    }

    setIsModalOpen(false);
  }

  async function handleDeleteSupplier(id: string) {
    if (!confirm("Supprimer ce fournisseur ?")) return;

    await deleteSupplier(id);

    setSuppliers((prev) =>
      prev.filter((supplier) => supplier.id !== id)
    );

    setLinks((prev) =>
      prev.filter((link) => link.supplier_id !== id)
    );
  }

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return suppliers;

    return suppliers.filter((supplier) =>
      [
        supplier.name,
        supplier.phone ?? "",
        supplier.address ?? "",
      ].some((value) => value.toLowerCase().includes(query))
    );
  }, [suppliers, search]);

  const ingredientLinksSorted = useMemo(() => {
    return links
      .filter((link) => link.ingredient_id === selectedIngredient)
      .map((link) => ({
        ...link,
        supplier: suppliers.find(
          (supplier) => supplier.id === link.supplier_id
        ),
      }))
      .filter((link) => link.supplier)
      .sort((a, b) => a.price - b.price);
  }, [links, selectedIngredient, suppliers]);

  const cheapestId = ingredientLinksSorted[0]?.supplier_id;

  const selectedIngredientName =
    ingredients.find((ingredient) => ingredient.id === selectedIngredient)
      ?.name ?? "";

  async function handleAddLink(
    supplierId: string,
    price: number
  ) {
    if (!selectedIngredient || !supplierId || price < 0) return;

    await upsertIngredientSupplier(
      selectedIngredient,
      supplierId,
      price
    );

    setLinks((prev) => [
      ...prev.filter(
        (link) =>
          !(
            link.ingredient_id === selectedIngredient &&
            link.supplier_id === supplierId
          )
      ),
      {
        ingredient_id: selectedIngredient,
        supplier_id: supplierId,
        price,
      },
    ]);
  }

  async function handleRemoveLink(supplierId: string) {
    await deleteIngredientSupplier(
      selectedIngredient,
      supplierId
    );

    setLinks((prev) =>
      prev.filter(
        (link) =>
          !(
            link.ingredient_id === selectedIngredient &&
            link.supplier_id === supplierId
          )
      )
    );
  }

  return (
    <div className="min-h-screen space-y-6 text-qahwa-text">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-qahwa-orange" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-qahwa-muted">
              Gestion du stock
            </span>
          </div>

          <h1 className="font-display text-3xl uppercase tracking-tight text-qahwa-text">
            Fournisseurs
          </h1>

          <p className="mt-1 text-sm text-qahwa-muted">
            Gérez vos fournisseurs et comparez vos coûts d&apos;achat.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-qahwa-orange px-5 font-display text-xs uppercase tracking-wide text-qahwa-noir shadow-panel transition hover:brightness-110 active:scale-[0.98]"
        >
          <span className="text-base leading-none">+</span>
          Ajouter un fournisseur
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-qahwa-border bg-qahwa-panel p-4 shadow-panel">
          <p className="text-[10px] font-bold uppercase tracking-wider text-qahwa-muted">
            Fournisseurs
          </p>
          <p className="mt-2 font-display text-2xl text-qahwa-text">
            {suppliers.length}
          </p>
        </div>

        <div className="rounded-2xl border border-qahwa-border bg-qahwa-panel p-4 shadow-panel">
          <p className="text-[10px] font-bold uppercase tracking-wider text-qahwa-muted">
            Ingrédients
          </p>
          <p className="mt-2 font-display text-2xl text-qahwa-text">
            {ingredients.length}
          </p>
        </div>

        <div className="col-span-2 rounded-2xl border border-qahwa-border bg-qahwa-panel p-4 shadow-panel lg:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-qahwa-muted">
            Comparaisons actives
          </p>
          <p className="mt-2 font-display text-2xl text-qahwa-orange">
            {links.length}
          </p>
        </div>
      </div>

      {/* FOURNISSEURS */}
      <section className="rounded-2xl border border-qahwa-border bg-qahwa-panel shadow-panel">
        <div className="border-b border-qahwa-border p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg uppercase">
                Mes fournisseurs
              </h2>
              <p className="mt-1 text-xs text-qahwa-muted">
                {filteredSuppliers.length} fournisseur
                {filteredSuppliers.length > 1 ? "s" : ""} affiché
                {filteredSuppliers.length > 1 ? "s" : ""}
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-qahwa-muted">
                ⌕
              </span>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>
        </div>

        {filteredSuppliers.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-qahwa-border bg-qahwa-panel2 text-xl text-qahwa-muted">
              +
            </div>

            <p className="mt-4 font-display text-sm uppercase">
              {suppliers.length === 0
                ? "Aucun fournisseur"
                : "Aucun résultat"}
            </p>

            <p className="mt-1 text-xs text-qahwa-muted">
              {suppliers.length === 0
                ? "Ajoutez votre premier fournisseur."
                : "Essayez une autre recherche."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
            {filteredSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="group rounded-2xl border border-qahwa-border bg-qahwa-panel2 p-4 transition hover:border-qahwa-orange/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-qahwa-orange/10 font-display text-sm text-qahwa-orange">
                      {supplier.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate font-display text-sm uppercase text-qahwa-text">
                        {supplier.name}
                      </h3>

                      <p className="mt-1 text-[10px] uppercase tracking-wider text-qahwa-muted">
                        Fournisseur
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => openEditModal(supplier)}
                      className="rounded-lg border border-qahwa-border px-2.5 py-1.5 text-[10px] font-bold uppercase text-qahwa-muted transition hover:border-qahwa-orange hover:text-qahwa-orange"
                    >
                      Modifier
                    </button>

                    <button
                      onClick={() =>
                        handleDeleteSupplier(supplier.id)
                      }
                      className="rounded-lg border border-qahwa-rouge/30 bg-qahwa-rouge/5 px-2.5 py-1.5 text-[10px] font-bold uppercase text-qahwa-rouge transition hover:bg-qahwa-rouge/10"
                    >
                      Suppr.
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-qahwa-border pt-3">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="w-5 text-center text-qahwa-orange">
                      ☎
                    </span>
                    <span className="truncate text-qahwa-muted">
                      {supplier.phone || "Téléphone non renseigné"}
                    </span>
                  </div>

                  <div className="flex items-start gap-3 text-xs">
                    <span className="w-5 text-center text-qahwa-orange">
                      ⌖
                    </span>
                    <span className="line-clamp-2 text-qahwa-muted">
                      {supplier.address || "Adresse non renseignée"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* PRIX */}
      <section className="rounded-2xl border border-qahwa-border bg-qahwa-panel shadow-panel">
        <div className="border-b border-qahwa-border p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-qahwa-green" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-qahwa-muted">
                  Analyse des coûts
                </span>
              </div>

              <h2 className="font-display text-lg uppercase">
                Prix par ingrédient
              </h2>

              <p className="mt-1 text-xs text-qahwa-muted">
                Comparez vos fournisseurs pour trouver le meilleur prix.
              </p>
            </div>

            <select
              value={selectedIngredient}
              onChange={(e) =>
                setSelectedIngredient(e.target.value)
              }
              className="min-h-11 w-full rounded-xl border border-qahwa-border bg-qahwa-panel2 px-3 text-sm text-qahwa-text outline-none focus:border-qahwa-orange sm:w-72"
            >
              {ingredients.map((ingredient) => (
                <option
                  key={ingredient.id}
                  value={ingredient.id}
                  className="bg-qahwa-panel"
                >
                  {ingredient.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {ingredientLinksSorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-qahwa-border bg-qahwa-panel2 p-8 text-center">
              <p className="font-display text-sm uppercase">
                Aucun fournisseur lié
              </p>

              <p className="mt-1 text-xs text-qahwa-muted">
                Aucun prix enregistré pour{" "}
                {selectedIngredientName || "cet ingrédient"}.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {ingredientLinksSorted.map((link, index) => {
                const isCheapest =
                  link.supplier_id === cheapestId;

                return (
                  <div
                    key={link.supplier_id}
                    className={`rounded-2xl border p-3 transition sm:p-4 ${
                      isCheapest
                        ? "border-qahwa-green/40 bg-qahwa-green/5"
                        : "border-qahwa-border bg-qahwa-panel2"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-display text-xs ${
                            isCheapest
                              ? "bg-qahwa-green/15 text-qahwa-green"
                              : "bg-qahwa-panel text-qahwa-muted"
                          }`}
                        >
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {link.supplier?.name}
                          </p>

                          {isCheapest && (
                            <span className="mt-1 inline-flex rounded-full bg-qahwa-green/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-qahwa-green">
                              Moins cher
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={link.price}
                          onBlur={(e) =>
                            handleAddLink(
                              link.supplier_id,
                              Number(e.target.value)
                            )
                          }
                          className="w-28 rounded-xl border border-qahwa-border bg-qahwa-panel px-3 py-2 text-right text-sm font-semibold text-qahwa-text outline-none focus:border-qahwa-orange"
                        />

                        <span className="text-xs font-bold text-qahwa-muted">
                          DA
                        </span>

                        <button
                          onClick={() =>
                            handleRemoveLink(link.supplier_id)
                          }
                          className="rounded-xl border border-qahwa-rouge/30 px-3 py-2 text-[10px] font-bold uppercase text-qahwa-rouge transition hover:bg-qahwa-rouge/10"
                        >
                          Retirer
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <LinkAdder
            suppliers={suppliers.filter(
              (supplier) =>
                !ingredientLinksSorted.some(
                  (link) =>
                    link.supplier_id === supplier.id
                )
            )}
            onAdd={handleAddLink}
          />
        </div>
      </section>

      {/* MODALE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveModal}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-qahwa-border bg-qahwa-panel shadow-2xl"
          >
            <div className="border-b border-qahwa-border p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-qahwa-orange">
                    Fournisseur
                  </p>

                  <h3 className="mt-1 font-display text-xl uppercase">
                    {editingSupplier
                      ? "Modifier"
                      : "Nouveau fournisseur"}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-qahwa-border text-qahwa-muted transition hover:border-qahwa-orange hover:text-qahwa-orange"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-qahwa-muted">
                  Nom
                </label>

                <input
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  placeholder="Ex : Metro"
                  className={`${inputClass} mt-1.5`}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-qahwa-muted">
                  Téléphone
                </label>

                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone: e.target.value,
                    })
                  }
                  placeholder="Ex : 0550 00 00 00"
                  className={`${inputClass} mt-1.5`}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-qahwa-muted">
                  Adresse
                </label>

                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      address: e.target.value,
                    })
                  }
                  placeholder="Adresse du fournisseur"
                  className={`${inputClass} mt-1.5`}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-qahwa-border p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="min-h-11 rounded-xl border border-qahwa-border bg-qahwa-panel2 px-5 text-xs font-bold uppercase text-qahwa-muted transition hover:text-qahwa-text"
              >
                Annuler
              </button>

              <button
                type="submit"
                className="min-h-11 rounded-xl bg-qahwa-orange px-5 text-xs font-bold uppercase text-qahwa-noir transition hover:brightness-110"
              >
                {editingSupplier
                  ? "Enregistrer"
                  : "Créer le fournisseur"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function LinkAdder({
  suppliers,
  onAdd,
}: {
  suppliers: Supplier[];
  onAdd: (
    supplierId: string,
    price: number
  ) => void;
}) {
  const [supplierId, setSupplierId] = useState(
    suppliers[0]?.id ?? ""
  );

  const [price, setPrice] = useState(0);

  if (suppliers.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl border border-dashed border-qahwa-border bg-qahwa-panel2 p-4">
      <div className="mb-3">
        <p className="font-display text-xs uppercase">
          Ajouter un fournisseur
        </p>

        <p className="mt-1 text-[11px] text-qahwa-muted">
          Associez un fournisseur à cet ingrédient.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={supplierId}
          onChange={(e) =>
            setSupplierId(e.target.value)
          }
          className="min-h-11 flex-1 rounded-xl border border-qahwa-border bg-qahwa-panel px-3 text-sm text-qahwa-text outline-none focus:border-qahwa-orange"
        >
          {suppliers.map((supplier) => (
            <option
              key={supplier.id}
              value={supplier.id}
              className="bg-qahwa-panel"
            >
              {supplier.name}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            value={price || ""}
            onChange={(e) =>
              setPrice(Number(e.target.value))
            }
            placeholder="Prix"
            className="min-h-11 w-full rounded-xl border border-qahwa-border bg-qahwa-panel px-3 text-sm text-qahwa-text outline-none focus:border-qahwa-orange sm:w-28"
          />

          <button
            type="button"
            onClick={() => {
              if (!supplierId || price < 0) return;

              onAdd(supplierId, price);
              setPrice(0);
            }}
            className="min-h-11 rounded-xl bg-qahwa-orange px-5 text-xs font-display uppercase text-qahwa-noir transition hover:brightness-110"
          >
            + Lier
          </button>
        </div>
      </div>
    </div>
  );
}