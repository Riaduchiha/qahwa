"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createIngredient(formData: any) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await (supabase.from("ingredients") as any)
      .insert([formData])
      .select();

    if (error) {
      console.error("Erreur Supabase (insert):", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("Erreur Serveur (createIngredient):", err);
    return { success: false, error: err?.message || "Erreur serveur interne" };
  }
}

export async function updateIngredient(id: string, formData: any) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await (supabase.from("ingredients") as any)
      .update(formData)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Erreur Supabase (update):", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("Erreur Serveur (updateIngredient):", err);
    return { success: false, error: err?.message || "Erreur serveur interne" };
  }
}

export async function deleteIngredient(id: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("ingredients").delete().eq("id", id);

    if (error) throw new Error(error.message);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function upsertProductIngredient(
  product_id: string,
  ingredient_id: string,
  quantity_used: number
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await (supabase.from("product_ingredients") as any)
      .upsert(
        [{ product_id, ingredient_id, quantity_used }],
        { onConflict: "product_id,ingredient_id" }
      )
      .select();

    if (error) throw new Error(error.message);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function deleteProductIngredient(product_id: string, ingredient_id: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("product_ingredients")
      .delete()
      .eq("product_id", product_id)
      .eq("ingredient_id", ingredient_id);

    if (error) throw new Error(error.message);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}