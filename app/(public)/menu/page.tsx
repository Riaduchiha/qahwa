import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { Category, Product } from "@/types/database";
import CategoryShowcase from "@/components/public/CategoryShowcase";
import CategoryNav from "@/components/public/CategoryNav";
// Étape 3 — Menu dynamique, présenté en carrousel par catégorie
// (référence visuelle envoyée par Imad le 28/08).
export const dynamic = "force-dynamic";
export const revalidate = 0;

type CategoryWithProducts = Category & { products: Product[] };

async function getMenu(): Promise<{
  categories: CategoryWithProducts[];
  error: string | null;
}> {
  const supabase = createSupabasePublicClient();

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .returns<Category[]>();

  if (categoriesError || !categories) {
    return { categories: [], error: categoriesError?.message ?? "unknown" };
  }

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("*, product_option_groups(*, product_options(*))")
    .eq("is_available", true)
    .order("display_order", { ascending: true })
    .returns<Product[]>();

  if (productsError) {
    return { categories: [], error: productsError.message };
  }

  const categoriesWithProducts: CategoryWithProducts[] = categories.map(
    (category) => ({
      ...category,
      products: (products ?? []).filter(
        (product) => product.category_id === category.id
      ),
    })
  );

  return { categories: categoriesWithProducts, error: null };
}

export default async function MenuPage() {
  const { categories, error } = await getMenu();

  if (error) {
    return (
      <section className="min-h-screen bg-qahwa-noir px-5 py-10">
        <h1 className="font-display text-3xl uppercase text-qahwa-blanc">
          Menu
        </h1>
        <p className="mt-4 rounded-xl border-2 border-qahwa-blanc bg-white p-4 text-sm text-qahwa-noir shadow-brutal-sm">
          Le menu n&apos;est pas encore connecté à la base de données.
          Configure les clés Supabase (<code>.env.local</code> en local,
          variables d&apos;environnement sur Vercel) puis exécute la
          migration <code>supabase/migrations/0001_menu.sql</code>.
        </p>
      </section>
    );
  }

  const categoriesWithItems = categories.filter((c) => c.products.length > 0);

  if (categoriesWithItems.length === 0) {
    return (
      <section className="min-h-screen bg-qahwa-noir px-5 py-10">
        <h1 className="font-display text-3xl uppercase text-qahwa-blanc">
          Menu
        </h1>
        <p className="mt-4 text-sm text-qahwa-blanc/60">
          Aucun produit disponible pour le moment. Ajoute des produits
          depuis QAHWA, ou directement dans Supabase en attendant.
        </p>
      </section>
    );
  }

  return (
        <div className="min-h-screen bg-qahwa-noir">
      <CategoryNav categories={categoriesWithItems} />
      {categoriesWithItems.map((category) => (
        <CategoryShowcase
          key={category.id}
          category={category}
          products={category.products}
        />
      ))}
    </div>
  );
}
