import Link from "next/link";
import { api, imgUrl } from "@/lib/api";
import ProductImage from "../components/ProductImage";
import ProductsSearchForm from "./ProductsSearchForm";

export const dynamic = "force-dynamic";

function getImg(p: { image?: string }) {
  if (!p.image) return "/product-placeholder.svg";
  if (p.image.startsWith("http")) return p.image;
  if (p.image.startsWith("/figma/")) return p.image;
  const clean = p.image.startsWith("/uploads/") ? p.image.slice("/uploads/".length) : p.image.replace(/^\//, "");
  return imgUrl(clean);
}

function fmt(n: number) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function getPrice(p: { price?: number; special_price?: number }) {
  const price = Number(p.price ?? 0);
  const special = Number(p.special_price ?? 0);
  if (special && price && special < price) return { price: fmt(special), original: fmt(price) };
  return { price: price ? fmt(price) : "—", original: "" };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; category_id?: string; type?: string }>;
}) {
  const resolved = await searchParams;
  const q = (resolved?.q ?? "").trim();
  const categoryId = resolved?.category_id;
  const typeSlug = resolved?.type;

  const [productsData, categoryTabsData] = await Promise.allSettled([
    api.products({
      per_page: 60,
      status: "1",
      ...(q ? { search: q } : {}),
      ...(categoryId ? { category_id: categoryId } : {}),
      ...(typeSlug ? { type: typeSlug } : {}),
    }),
    api.categoryTabs(categoryId ? { category_id: categoryId } : undefined),
  ]);

  const products = productsData.status === "fulfilled" ? productsData.value.rows : [];
  const categoryTabs = categoryTabsData.status === "fulfilled" ? categoryTabsData.value.rows : [];

  // Build hrefs that preserve the other active filters when toggling tabs.
  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (categoryId) baseParams.set("category_id", categoryId);
  const buildTabHref = (tabSlug?: string) => {
    const p = new URLSearchParams(baseParams);
    if (tabSlug) p.set("type", tabSlug);
    const qs = p.toString();
    return qs ? `/products?${qs}` : "/products";
  };
  const isAllTabsActive = !typeSlug;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-8 min-h-screen">
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-ink md:text-[30px]">All Products</h1>
        <p className="mt-1 text-[14px] text-[#8c8c8c]">
          {q ? `Showing results for "${q}" — ` : ""}
          {products.length} {products.length === 1 ? "product" : "products"}
        </p>
      </div>

      <ProductsSearchForm initialQuery={q} categoryId={categoryId} typeSlug={typeSlug} />

      {categoryTabs.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href={buildTabHref()}
            scroll={false}
            className={isAllTabsActive
              ? "inline-flex h-[40px] items-center justify-center rounded-full border-[1.5px] border-ink px-7 text-[13px] font-semibold text-ink"
              : "inline-flex h-[40px] items-center justify-center rounded-full border border-[#cfcfcf] px-7 text-[13px] font-normal text-[#525151] hover:bg-black/5"
            }
          >
            All
          </Link>
          {categoryTabs.map((t) => {
            const isActive = typeSlug === t.slug;
            return (
              <Link
                key={t.slug}
                href={buildTabHref(t.slug)}
                scroll={false}
                className={isActive
                  ? "inline-flex h-[40px] items-center justify-center rounded-full border-[1.5px] border-ink px-7 text-[13px] font-semibold text-ink"
                  : "inline-flex h-[40px] items-center justify-center rounded-full border border-[#cfcfcf] px-7 text-[13px] font-normal text-[#525151] hover:bg-black/5"
                }
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      )}

      {products.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="text-[60px]">🛍️</div>
          <p className="text-[18px] font-semibold text-ink">No products found</p>
          {(q || typeSlug || categoryId) && (
            <Link
              href="/products"
              className="inline-flex h-[42px] items-center justify-center rounded-full border border-[#cfcfcf] px-8 text-[13px] font-medium text-ink hover:bg-black/5"
            >
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {products.map((p) => {
            const { price, original } = getPrice(p);
            return (
              <Link
                key={p.id}
                href={`/product/${p.id}`}
                className="group flex flex-col overflow-hidden rounded-[18px] border border-[#e7e7e7] bg-white transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-center bg-[#f9f9f9] px-4 py-4">
                  <ProductImage
                    src={getImg(p)}
                    alt={p.name}
                    className="h-[160px] w-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="border-t border-[#eeeeee] px-3 py-3">
                  <h3 className="text-[12px] font-medium text-ink line-clamp-2 group-hover:underline">{p.name}</h3>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-ink">{price}</span>
                    {original && <span className="text-[12px] text-[#8c8c8c] line-through">{original}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
