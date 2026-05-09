import { redirect } from "next/navigation";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";
import AllProducts from "./components/AllProducts";
import BagCollection from "./components/BagCollection";
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

  // Category browsing lives on /products now — bounce any /?category_id=… or
  // /?type=… link there so we don't have two pages doing the same thing.
  if (categoryId || typeSlug) {
    const params = new URLSearchParams();
    if (categoryId) params.set("category_id", String(categoryId));
    if (typeSlug) params.set("type", String(typeSlug));
    redirect(`/products?${params.toString()}`);
  }

  const [productsData, categoriesData, categoryTabsData, slidersData, settingsData, collectionsData] = await Promise.allSettled([
    api.products({ per_page: 20, status: "1" }),
    api.categories(),
    api.categoryTabs(),
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

  return (
    <>
      <Hero sliders={sliders} />
      <TopSelling products={topSellingProducts} settings={settings} />
      <BagCollection collections={collections} />
      <AllProducts
        products={products}
        categories={categories}
        categoryTabs={categoryTabs}
      />
    </>
  );
}
