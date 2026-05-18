import { api } from "@/lib/api";
import Link from "next/link";
import { imgUrl } from "@/lib/api";
import ProductImage from "../components/ProductImage";
import { formatMoney as fmt } from "@/lib/format";

export const dynamic = "force-dynamic";

function getImg(p: { image?: string }) {
  if (!p.image) return "/product-placeholder.svg";
  if (p.image.startsWith("http")) return p.image;
  if (p.image.startsWith("/figma/")) return p.image;
  const clean = p.image.startsWith("/uploads/") ? p.image.slice("/uploads/".length) : p.image.replace(/^\//, "");
  return imgUrl(clean);
}

function getPrice(p: { price?: number; special_price?: number }) {
  const price = Number(p.price ?? 0);
  const special = Number(p.special_price ?? 0);
  if (special && price && special < price) return { price: fmt(special), original: fmt(price) };
  return { price: price ? fmt(price) : "—", original: "" };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const resolved = await searchParams;
  const q = (resolved?.q ?? "").trim();

  // Fire both lookups in parallel so the empty-state recovery doesn't add a
  // serialised round-trip to every search. The trending list is only used
  // when the query is empty OR returns zero results — we still pay for it
  // on every page load, but the request runs alongside the search instead
  // of after it.
  const [data, trendingData] = await Promise.all([
    q
      ? api.products({ per_page: 40, status: "1", search: q }).catch(() => ({ rows: [] }))
      : Promise.resolve({ rows: [] }),
    api.popularProducts({ limit: 10 }).catch(() => ({ rows: [] })),
  ]);

  const products = (data as { rows: any[] }).rows ?? [];
  const showTrending = !q || products.length === 0;
  const trending = showTrending ? ((trendingData as { rows: any[] }).rows ?? []) : [];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-[24px] font-bold text-ink md:text-[30px]">
          {q ? `Search results for "${q}"` : "Search Products"}
        </h1>
        {q && (
          <p className="mt-1 text-[14px] text-[#8c8c8c]">
            {products.length} {products.length === 1 ? "product" : "products"} found
          </p>
        )}
      </div>

      {!q && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="text-[60px]">🔍</div>
          <p className="text-[18px] font-semibold text-ink">Type something to search</p>
          <Link href="/" className="inline-flex h-[42px] items-center justify-center rounded-full border border-[#cfcfcf] px-8 text-[13px] font-medium text-ink hover:bg-black/5">
            Browse All Products
          </Link>
        </div>
      )}

      {q && products.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="text-[60px]">😕</div>
          <p className="text-[18px] font-semibold text-ink">No products found for &quot;{q}&quot;</p>
          <p className="text-[14px] text-[#8c8c8c]">Try a different keyword or browse all products.</p>
          <Link href="/" className="inline-flex h-[42px] items-center justify-center rounded-full border border-[#cfcfcf] px-8 text-[13px] font-medium text-ink hover:bg-black/5">
            Browse All Products
          </Link>
        </div>
      )}

      {showTrending && trending.length > 0 && (
        <section className="mt-2">
          <h2 className="mb-4 text-[18px] font-semibold text-ink">Trending right now</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {trending.map((p: any) => {
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
        </section>
      )}

      {products.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {products.map((p: any) => {
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
