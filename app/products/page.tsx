import { api } from "@/lib/api";
import ProductsClient from "./ProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    category_id?: string;
    type?: string;
    // Filters live in the URL so they survive refresh and can be shared.
    brand_id?: string;
    price_min?: string;
    price_max?: string;
    in_stock?: string;
    sort?: string;
  }>;
}) {
  const resolved = await searchParams;
  const q = (resolved?.q ?? "").trim();
  const categoryId = resolved?.category_id;
  const typeSlug = resolved?.type;
  const brandId = resolved?.brand_id;
  const priceMin = resolved?.price_min;
  const priceMax = resolved?.price_max;
  const inStock = resolved?.in_stock;
  const sort = resolved?.sort;

  const [productsData, categoryTabsData, settingsData, brandsData] = await Promise.allSettled([
    api.products({
      per_page: 60,
      status: "1",
      ...(q ? { search: q } : {}),
      ...(categoryId ? { category_id: categoryId } : {}),
      ...(typeSlug ? { type: typeSlug } : {}),
      ...(brandId ? { brand_id: brandId } : {}),
      ...(priceMin ? { price_min: priceMin } : {}),
      ...(priceMax ? { price_max: priceMax } : {}),
      ...(inStock ? { in_stock: inStock } : {}),
      ...(sort ? { sort } : {}),
    }),
    api.categoryTabs(categoryId ? { category_id: categoryId } : undefined),
    api.settings(),
    api.brands(),
  ]);

  const products = productsData.status === "fulfilled" ? productsData.value.rows : [];
  const categoryTabs = categoryTabsData.status === "fulfilled" ? categoryTabsData.value.rows : [];
  const settings = settingsData.status === "fulfilled" ? settingsData.value : {};
  const brands = brandsData.status === "fulfilled" ? brandsData.value.rows : [];

  return (
    <ProductsClient
      products={products}
      categoryTabs={categoryTabs}
      selectedTypeSlug={typeSlug}
      q={q}
      categoryId={categoryId}
      settings={settings}
      brands={brands}
      filters={{
        brandId,
        priceMin,
        priceMax,
        inStock,
        sort,
      }}
    />
  );
}
