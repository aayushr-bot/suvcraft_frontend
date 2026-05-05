import { api } from "@/lib/api";

export const dynamic = "force-dynamic";
import AllProducts from "./components/AllProducts";
import BagCollection from "./components/BagCollection";
import FeatureStrip from "./components/FeatureStrip";
import Hero from "./components/Hero";
import TopSelling from "./components/TopSelling";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ category_id?: string; type?: string }>;
}) {
  const resolved = await searchParams;
  const categoryId = resolved?.category_id;
  const typeSlug = resolved?.type;

  const [productsData, categoriesData, categoryTabsData, slidersData, settingsData, collectionsData] = await Promise.allSettled([
    api.products({
      per_page: 20,
      status: "1",
      ...(categoryId ? { category_id: categoryId } : {}),
      ...(typeSlug ? { type: typeSlug } : {}),
    }),
    api.categories(),
    api.categoryTabs(categoryId ? { category_id: categoryId } : undefined),
    api.sliders({ type: "hero" }),
    api.settings(),
    api.collections(),
  ]);

  const products = productsData.status === "fulfilled" ? productsData.value.rows : [];
  const categories = categoriesData.status === "fulfilled" ? categoriesData.value.rows : [];
  const categoryTabs = categoryTabsData.status === "fulfilled" ? categoryTabsData.value.rows : [];
  const sliders = slidersData.status === "fulfilled" ? slidersData.value.rows : [];
  const settings = settingsData.status === "fulfilled" ? settingsData.value : {};
  const collections = collectionsData.status === "fulfilled" ? collectionsData.value.rows : [];

  // Resolve admin-selected products for the Top-Selling section.
  // Falls back to first 4 products if nothing is curated.
  const featuredIds = (settings.topselling_product_ids || "").trim();
  const topSellingResult = featuredIds
    ? await api.products({ ids: featuredIds }).catch(() => ({ rows: [] as typeof products }))
    : null;
  const topSellingProducts = topSellingResult?.rows?.length
    ? topSellingResult.rows
    : products.slice(0, 4);

  const showHero = !categoryId;

  return (
    <>
      {showHero && <Hero sliders={sliders} settings={settings} />}
      {showHero && <FeatureStrip settings={settings} />}
      {showHero && <TopSelling products={topSellingProducts} settings={settings} />}
      {showHero && <BagCollection collections={collections} />}
      <AllProducts
        products={products}
        categories={categories}
        categoryTabs={categoryTabs}
        selectedCategoryId={categoryId ? Number(categoryId) : undefined}
        selectedTypeSlug={typeSlug}
      />
    </>
  );
}
