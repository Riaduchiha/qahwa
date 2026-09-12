'use client'

import { useState } from 'react'
import {
  createIngredient,
  updateIngredient,
  deleteIngredient,
  upsertProductIngredient,
  deleteProductIngredient,
} from './actions'

type IngredientUnit = 'g' | 'ml' | 'unite' | 'kg' | 'l'

type Ingredient = {
  id: string
  name: string
  unit: IngredientUnit
  quantity_in_stock: number
  alert_threshold: number
  cost_per_unit: number
}

type Product = { id: string; name: string }
type Recipe = { product_id: string; ingredient_id: string; quantity_used: number }

export default function StockManager({
  initialIngredients,
  products,
  initialRecipes,
}: {
  initialIngredients: Ingredient[]
  products: Product[]
  initialRecipes: Recipe[]
}) {
  const [ingredients, setIngredients] = useState(initialIngredients)
  const [recipes, setRecipes] = useState(initialRecipes)
  const [selectedProduct, setSelectedProduct] = useState(products[0]?.id ?? '')

  function handleIngredientChange(id: string, field: keyof Ingredient, value: string) {
    setIngredients((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, [field]: field === 'name' || field === 'unit' ? value : Number(value) } : i
      )
    )
  }

  async function handleIngredientBlur(ing: Ingredient) {
    // Si l'utilisateur choisit kg ou l, on convertit en g/ml et on ajuste le prix unitaire
    let baseUnit = ing.unit
    let baseQty = ing.quantity_in_stock
    let baseCost = ing.cost_per_unit ?? 0
    let baseAlert = ing.alert_threshold

    if (ing.unit === 'kg') {
      baseUnit = 'g'
      baseQty = ing.quantity_in_stock * 1000
      baseCost = (ing.cost_per_unit ?? 0) / 1000
      baseAlert = ing.alert_threshold * 1000
    } else if (ing.unit === 'l') {
      baseUnit = 'ml'
      baseQty = ing.quantity_in_stock * 1000
      baseCost = (ing.cost_per_unit ?? 0) / 1000
      baseAlert = ing.alert_threshold * 1000
    }

    await updateIngredient(ing.id, {
      name: ing.name,
      unit: baseUnit,
      quantity_in_stock: baseQty,
      alert_threshold: baseAlert,
      cost_per_unit: baseCost,
    })
  }

  async function handleAddIngredient() {
    const name = prompt("Nom de l'ingrédient (ex: Grain Café)")
    if (!name) return
    const unitInput = (prompt('Unité (g, ml, unite, kg, l)', 'kg') || 'g') as IngredientUnit

    let baseUnit: 'g' | 'ml' | 'unite' = 'g'
    if (unitInput === 'ml' || unitInput === 'l') baseUnit = 'ml'
    if (unitInput === 'unite') baseUnit = 'unite'

    await createIngredient({ name, unit: baseUnit, quantity_in_stock: 0, alert_threshold: 0, cost_per_unit: 0 })
    location.reload()
  }

  async function handleDeleteIngredient(id: string) {
    if (!confirm('Supprimer cet ingrédient ?')) return
    await deleteIngredient(id)
    setIngredients((prev) => prev.filter((i) => i.id !== id))
  }

  const productRecipes = recipes.filter((r) => r.product_id === selectedProduct)

  async function handleAddRecipeLine(ingredientId: string, quantity: number) {
    await upsertProductIngredient(selectedProduct, ingredientId, quantity)
    setRecipes((prev) => [
      ...prev.filter((r) => !(r.product_id === selectedProduct && r.ingredient_id === ingredientId)),
      { product_id: selectedProduct, ingredient_id: ingredientId, quantity_used: quantity },
    ])
  }

  async function handleRemoveRecipeLine(ingredientId: string) {
    await deleteProductIngredient(selectedProduct, ingredientId)
    setRecipes((prev) => prev.filter((r) => !(r.product_id === selectedProduct && r.ingredient_id === ingredientId)))
  }

  return (
    <div className="p-6 space-y-10">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black">Stock des ingrédients</h2>
          <button onClick={handleAddIngredient} className="bg-[#FF6B00] text-white font-bold px-4 py-2 border-2 border-black">
            + Ajouter un ingrédient
          </button>
        </div>

        <table className="w-full border-2 border-black">
          <thead>
            <tr className="bg-black text-white text-left">
              <th className="p-2">Nom</th>
              <th className="p-2">Quantité en stock</th>
              <th className="p-2">Unité</th>
              <th className="p-2">Coût / Unité (DA)</th>
              <th className="p-2">Seuil d'alerte</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ing) => {
              const isLow = ing.quantity_in_stock <= ing.alert_threshold
              return (
                <tr key={ing.id} className={`border-t border-black ${isLow ? 'bg-red-50' : ''}`}>
                  <td className="p-2">
                    <input
                      className="w-full bg-transparent"
                      value={ing.name}
                      onChange={(e) => handleIngredientChange(ing.id, 'name', e.target.value)}
                      onBlur={() => handleIngredientBlur(ing)}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.01"
                      className="w-28 bg-transparent"
                      value={ing.quantity_in_stock}
                      onChange={(e) => handleIngredientChange(ing.id, 'quantity_in_stock', e.target.value)}
                      onBlur={() => handleIngredientBlur(ing)}
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={ing.unit}
                      onChange={(e) => {
                        const v = e.target.value as IngredientUnit
                        handleIngredientChange(ing.id, 'unit', v)
                        handleIngredientBlur({ ...ing, unit: v })
                      }}
                    >
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="l">l</option>
                      <option value="unite">unité</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.0001"
                      className="w-28 bg-transparent font-mono text-[#FF6B00] font-bold"
                      value={ing.cost_per_unit ?? 0}
                      onChange={(e) => handleIngredientChange(ing.id, 'cost_per_unit', e.target.value)}
                      onBlur={() => handleIngredientBlur(ing)}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.01"
                      className="w-24 bg-transparent"
                      value={ing.alert_threshold}
                      onChange={(e) => handleIngredientChange(ing.id, 'alert_threshold', e.target.value)}
                      onBlur={() => handleIngredientBlur(ing)}
                    />
                  </td>
                  <td className="p-2">
                    <button onClick={() => handleDeleteIngredient(ing.id)} className="text-red-600 font-bold">
                      Suppr.
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-2xl font-black mb-4">Recettes des produits</h2>
        <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="border-2 border-black p-2 mb-4">
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <ul className="space-y-2 mb-4">
          {productRecipes.map((r) => {
            const ing = ingredients.find((i) => i.id === r.ingredient_id)
            if (!ing) return null
            const subtotal = (ing.cost_per_unit ?? 0) * r.quantity_used
            return (
              <li key={r.ingredient_id} className="flex items-center gap-3 border-b pb-1">
                <span className="flex-1 font-bold">{ing.name}</span>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={r.quantity_used}
                  className="w-24 border border-black px-1"
                  onBlur={(e) => handleAddRecipeLine(ing.id, Number(e.target.value))}
                />
                <span className="w-12">{ing.unit}</span>
                <span className="text-xs text-gray-500 font-mono w-28">({subtotal.toFixed(2)} DA)</span>
                <button onClick={() => handleRemoveRecipeLine(ing.id)} className="text-red-600 font-bold">
                  Retirer
                </button>
              </li>
            )
          })}
        </ul>

        <RecipeAdder
          ingredients={ingredients.filter((i) => !productRecipes.some((r) => r.ingredient_id === i.id))}
          onAdd={handleAddRecipeLine}
        />
      </section>
    </div>
  )
}

function RecipeAdder({ ingredients, onAdd }: { ingredients: Ingredient[]; onAdd: (ingredientId: string, quantity: number) => void }) {
  const [ingredientId, setIngredientId] = useState('')
  const [quantity, setQuantity] = useState(0)

  if (ingredients.length === 0) return null

  const selectedId = ingredientId || ingredients[0]?.id || ''

  return (
    <div className="flex items-center gap-3">
      <select value={selectedId} onChange={(e) => setIngredientId(e.target.value)} className="border border-black p-1">
        {ingredients.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name}
          </option>
        ))}
      </select>
      <input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-24 border border-black px-1" placeholder="quantité" />
      <button
        onClick={() => {
          if (!selectedId) return
          onAdd(selectedId, quantity)
          setQuantity(0)
        }}
        className="bg-black text-white px-3 py-1 font-bold"
      >
        + Ajouter à la recette
      </button>
    </div>
  )
}