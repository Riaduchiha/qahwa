'use client'

import { useMemo, useState } from 'react'
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
  upsertIngredientSupplier,
  deleteIngredientSupplier,
} from './actions'

type Supplier = { id: string; name: string; phone: string | null; address: string | null }
type Ingredient = { id: string; name: string; unit: string }
type Link = { ingredient_id: string; supplier_id: string; price: number }

const inputClass =
  "w-full rounded-lg border border-qahwa-border bg-qahwa-panel2 px-3 py-2 text-sm text-qahwa-text placeholder:text-qahwa-muted focus:outline-none focus:ring-2 focus:ring-qahwa-orange"

export default function SuppliersManager({
  initialSuppliers,
  ingredients,
  initialLinks,
}: {
  initialSuppliers: Supplier[]
  ingredients: Ingredient[]
  initialLinks: Link[]
}) {
  const [suppliers, setSuppliers] = useState(initialSuppliers)
  const [links, setLinks] = useState(initialLinks)
  const [selectedIngredient, setSelectedIngredient] = useState(ingredients[0]?.id ?? '')
  const [search, setSearch] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', address: '' })

  function openAddModal() {
    setEditingSupplier(null)
    setForm({ name: '', phone: '', address: '' })
    setIsModalOpen(true)
  }

  function openEditModal(s: Supplier) {
    setEditingSupplier(s)
    setForm({ name: s.name, phone: s.phone ?? '', address: s.address ?? '' })
    setIsModalOpen(true)
  }

  async function handleSaveModal(e: React.FormEvent) {
    e.preventDefault()
    if (editingSupplier) {
      await updateSupplier(editingSupplier.id, form)
      setSuppliers((prev) => prev.map((s) => (s.id === editingSupplier.id ? { ...s, ...form } : s)))
    } else {
      await createSupplier(form)
      location.reload()
    }
    setIsModalOpen(false)
  }

  async function handleDeleteSupplier(id: string) {
    if (!confirm('Supprimer ce fournisseur ?')) return
    await deleteSupplier(id)
    setSuppliers((prev) => prev.filter((s) => s.id !== id))
    setLinks((prev) => prev.filter((l) => l.supplier_id !== id))
  }

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return suppliers
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone ?? '').toLowerCase().includes(q) ||
        (s.address ?? '').toLowerCase().includes(q)
    )
  }, [suppliers, search])

  const ingredientLinksSorted = useMemo(() => {
    return links
      .filter((l) => l.ingredient_id === selectedIngredient)
      .map((l) => ({ ...l, supplier: suppliers.find((s) => s.id === l.supplier_id) }))
      .filter((l) => l.supplier)
      .sort((a, b) => a.price - b.price)
  }, [links, selectedIngredient, suppliers])

  const cheapestId = ingredientLinksSorted[0]?.supplier_id

  async function handleAddLink(supplierId: string, price: number) {
    await upsertIngredientSupplier(selectedIngredient, supplierId, price)
    setLinks((prev) => [
      ...prev.filter((l) => !(l.ingredient_id === selectedIngredient && l.supplier_id === supplierId)),
      { ingredient_id: selectedIngredient, supplier_id: supplierId, price },
    ])
  }

  async function handleRemoveLink(supplierId: string) {
    await deleteIngredientSupplier(selectedIngredient, supplierId)
    setLinks((prev) => prev.filter((l) => !(l.ingredient_id === selectedIngredient && l.supplier_id === supplierId)))
  }

  const selectedIngredientName = ingredients.find((i) => i.id === selectedIngredient)?.name ?? ''

  return (
    <div className="space-y-8 p-6 text-qahwa-text">
      {/* SECTION FOURNISSEURS */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl uppercase text-qahwa-text">Fournisseurs</h2>
            <p className="mt-1 text-sm text-qahwa-muted">Gérez vos fournisseurs et leurs coordonnées</p>
          </div>
          <button
            onClick={openAddModal}
            className="rounded-lg border border-qahwa-orange bg-qahwa-orange px-4 py-2 font-display text-xs uppercase text-qahwa-noir shadow-panel hover:bg-qahwa-orange/90 whitespace-nowrap"
          >
            + Ajouter un fournisseur
          </button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un fournisseur (nom, téléphone, adresse)..."
          className={inputClass}
        />

        <div className="overflow-hidden rounded-xl border border-qahwa-border bg-qahwa-panel shadow-panel">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-qahwa-border bg-qahwa-panel2 text-xs font-display uppercase text-qahwa-muted">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Adresse</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-qahwa-border">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-qahwa-muted">
                    {suppliers.length === 0 ? 'Aucun fournisseur enregistré.' : 'Aucun résultat pour cette recherche.'}
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-qahwa-panel2/50 transition">
                    <td className="px-4 py-3 font-medium text-qahwa-text">{s.name}</td>
                    <td className="px-4 py-3 text-qahwa-muted">{s.phone || '—'}</td>
                    <td className="px-4 py-3 text-qahwa-muted">{s.address || '—'}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(s)}
                        className="rounded border border-qahwa-border bg-qahwa-panel2 px-2 py-1 text-xs text-qahwa-muted hover:text-qahwa-text"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteSupplier(s.id)}
                        className="rounded border border-qahwa-rouge/40 bg-qahwa-rouge/10 px-2 py-1 text-xs text-qahwa-rouge"
                      >
                        Suppr.
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION PRIX PAR INGREDIENT */}
      <section className="space-y-4">
        <div className="rounded-xl border border-qahwa-border bg-qahwa-panel p-5 shadow-panel">
          <h2 className="font-display text-lg uppercase text-qahwa-text mb-1">Prix par ingrédient</h2>
          <p className="text-xs text-qahwa-muted mb-4">Comparez les prix de vos fournisseurs, du moins cher au plus cher</p>

          <select
            value={selectedIngredient}
            onChange={(e) => setSelectedIngredient(e.target.value)}
            className={`${inputClass} mb-4 max-w-xs`}
          >
            {ingredients.map((i) => (
              <option key={i.id} value={i.id} className="bg-qahwa-panel">{i.name}</option>
            ))}
          </select>

          {ingredientLinksSorted.length === 0 ? (
            <p className="mb-4 text-sm text-qahwa-muted">
              Aucun fournisseur lié à {selectedIngredientName || 'cet ingrédient'} pour le moment.
            </p>
          ) : (
            <ul className="space-y-2 mb-4">
              {ingredientLinksSorted.map((l) => {
                const isCheapest = l.supplier_id === cheapestId
                return (
                  <li
                    key={l.supplier_id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                      isCheapest
                        ? 'border-qahwa-green/50 bg-qahwa-green/10'
                        : 'border-qahwa-border bg-qahwa-panel2'
                    }`}
                  >
                    {isCheapest && (
                      <span className="rounded-full border border-qahwa-green/50 bg-qahwa-green/20 px-2 py-0.5 text-[10px] font-display uppercase text-qahwa-green whitespace-nowrap">
                        Moins cher
                      </span>
                    )}
                    <span className="flex-1 text-sm font-medium">{l.supplier?.name}</span>
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={l.price}
                      className="w-28 rounded-lg border border-qahwa-border bg-qahwa-panel px-2 py-1 text-sm text-qahwa-text"
                      onBlur={(e) => handleAddLink(l.supplier_id, Number(e.target.value))}
                    />
                    <span className="text-xs text-qahwa-muted">DA</span>
                    <button onClick={() => handleRemoveLink(l.supplier_id)} className="text-xs font-bold text-qahwa-rouge">
                      Retirer
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <LinkAdder
            suppliers={suppliers.filter((s) => !ingredientLinksSorted.some((l) => l.supplier_id === s.id))}
            onAdd={handleAddLink}
          />
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <form
            onSubmit={handleSaveModal}
            className="w-96 space-y-4 rounded-xl border border-qahwa-border bg-qahwa-panel p-6 shadow-panel"
          >
            <h3 className="font-display text-lg uppercase text-qahwa-text">
              {editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
            </h3>
            <div>
              <label className="text-xs uppercase text-qahwa-muted">Nom</label>
              <input
                required
                className={`${inputClass} mt-1`}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-qahwa-muted">Téléphone</label>
              <input
                className={`${inputClass} mt-1`}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-qahwa-muted">Adresse</label>
              <input
                className={`${inputClass} mt-1`}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-4 py-2 text-xs font-bold uppercase text-qahwa-text"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-lg bg-qahwa-orange px-4 py-2 text-xs font-bold uppercase text-qahwa-noir"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function LinkAdder({ suppliers, onAdd }: { suppliers: Supplier[]; onAdd: (supplierId: string, price: number) => void }) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '')
  const [price, setPrice] = useState(0)

  if (suppliers.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-qahwa-border bg-qahwa-panel2 p-3">
      <select
        value={supplierId}
        onChange={(e) => setSupplierId(e.target.value)}
        className="rounded-lg border border-qahwa-border bg-qahwa-panel px-2 py-1.5 text-sm text-qahwa-text"
      >
        {suppliers.map((s) => (
          <option key={s.id} value={s.id} className="bg-qahwa-panel">{s.name}</option>
        ))}
      </select>
      <input
        type="number"
        step="0.01"
        value={price || ''}
        onChange={(e) => setPrice(Number(e.target.value))}
        placeholder="prix"
        className="w-28 rounded-lg border border-qahwa-border bg-qahwa-panel px-2 py-1.5 text-sm text-qahwa-text"
      />
      <button
        onClick={() => { onAdd(supplierId, price); setPrice(0) }}
        className="rounded-lg bg-qahwa-orange px-4 py-1.5 text-xs font-display uppercase text-qahwa-noir"
      >
        + Lier
      </button>
    </div>
  )
}