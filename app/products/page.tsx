import { api } from "@/lib/api";
import ProductsClient from "./ProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; category_id?: string; type?: string }>;
}) {
  const resolved = await searchParams;
  const q = (resolved?.q ?? "").trim();
  const categoryId = resolved?.category_id;
  const typeSlug = resolved?.type;

  const [productsData, categoryTabsData, settingsData] = await Promise.allSettled([
    api.products({
      per_page: 60,
      status: "1",
      ...(q ? { search: q } : {}),
      ...(categoryId ? { category_id: categoryId } : {}),
      ...(typeSlug ? { type: typeSlug } : {}),
    }),
    api.categoryTabs(categoryId ? { category_id: categoryId } : undefined),
    api.settings(),
  ]);

  const products = productsData.status === "fulfilled" ? productsData.value.rows : [];
  const categoryTabs = categoryTabsData.status === "fulfilled" ? categoryTabsData.value.rows : [];
  const settings = settingsData.status === "fulfilled" ? settingsData.value : {};

  return (
    <ProductsClient
      products={products}
      categoryTabs={categoryTabs}
      selectedTypeSlug={typeSlug}
      q={q}
      categoryId={categoryId}
      settings={settings}
    />
  );
}
