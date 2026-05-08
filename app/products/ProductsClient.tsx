"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IoCart } from "react-icons/io5";
import ProductImage from "../components/ProductImage";
import { type Product, type CategoryTab, type SiteSettings, imgUrl } from "@/lib/api";
import { Star } from "../components/icons";

const PLACEHOLDER_IMG = "/product-placeholder.svg";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

function getImg(p: { image?: string }) {
  if (!p.image) return PLACEHOLDER_IMG;
  if (p.image.startsWith("http")) return p.image;
  if (p.image.startsWith("/figma/")) return p.image;
  const clean = p.image.startsWith("/uploads/") ? p.image.slice("/uploads/".length) : p.image.replace(/^\//, "");
  return imgUrl(clean);
}

function fmt(n: number) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function resolveAvatar(path?: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/figma/")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}

export default function ProductsClient({
  products,
  categoryTabs,
  selectedTypeSlug,
  q,
  categoryId,
  settings,
}: {
  products: Product[];
  categoryTabs: CategoryTab[];
  selectedTypeSlug?: string;
  q?: string;
  categoryId?: string;
  settings: SiteSettings;
}) {
  const router = useRouter();
  const [priceMax, setPriceMax] = useState(10000);
  const [colorFilter, setColorFilter] = useState<Set<string>>(new Set());
  const [conditionFilter, setConditionFilter] = useState<Set<string>>(new Set());
  const [showCount, setShowCount] = useState<10 | 20 | 50 | 100>(50);
  const [sortBy, setSortBy] = useState<"featured" | "price-low" | "price-high" | "rating">("featured");

  const baseParams = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (categoryId) p.set("category_id", categoryId);
    return p;
  }, [q, categoryId]);

  const buildTabHref = (tabSlug?: string) => {
    const p = new URLSearchParams(baseParams);
    if (tabSlug) p.set("type", tabSlug);
    const qs = p.toString();
    return qs ? `/products?${qs}` : "/products";
  };
  const isAllTabsActive = !selectedTypeSlug;

  // Tally counts of distinct colors across the loaded product set so the
  // sidebar can show "Red (78)" etc. without an extra round-trip.
  const colorCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const colors = (p as Product & { colors?: { value: string }[] }).colors || [];
      for (const c of colors) {
        const key = String(c.value).trim();
        if (!key) continue;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [products]);

  const filteredAndSorted = useMemo(() => {
    let list = [...products];
    if (priceMax < 10000) {
      list = list.filter((p) => {
        const price = Number(p.special_price ?? 0) || Number(p.price ?? 0);
        return price <= priceMax;
      });
    }
    if (colorFilter.size > 0) {
      list = list.filter((p) => {
        const colors = (p as Product & { colors?: { value: string }[] }).colors || [];
        return colors.some((c) => colorFilter.has(String(c.value).trim()));
      });
    }
    switch (sortBy) {
      case "price-low":
        list.sort((a, b) => (Number(a.special_price || a.price || 0)) - (Number(b.special_price || b.price || 0)));
        break;
      case "price-high":
        list.sort((a, b) => (Number(b.special_price || b.price || 0)) - (Number(a.special_price || a.price || 0)));
        break;
      case "rating":
        list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
        break;
    }
    return list.slice(0, showCount);
  }, [products, priceMax, colorFilter, sortBy, showCount]);

  const avatars = [
    settings.products_avatar_1,
    settings.products_avatar_2,
    settings.products_avatar_3,
  ].filter((s): s is string => Boolean(s && s.trim()));
  const customerCount = (settings.products_customer_count || "").trim();
  const customerLabel = (settings.products_customer_label || "").trim();
  const showCustomerBlock = avatars.length > 0 && customerCount.length > 0;

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(179.62deg, #FFF6DE 0.33%, #FFFFFF 12.73%)" }}
    >
      <div className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-8">
      {/* Top heading row */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <h1 className="text-[32px] md:text-[40px] font-bold text-ink leading-tight">Our All Products</h1>
          <p className="mt-2 text-[14px] text-[#8c8c8c] max-w-[400px]">
            What is Lorem Ipsum? Lorem Ipsum is simply dummy text of the
          </p>
        </div>
        {showCustomerBlock && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex -space-x-3">
              {avatars.map((src, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={i}
                  src={resolveAvatar(src)}
                  alt=""
                  className="h-12 w-12 rounded-full border-[3px] border-white object-cover shadow-sm"
                />
              ))}
              <span className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-white bg-white text-ink text-[18px] font-medium shadow-sm">+</span>
            </div>
            <div className="text-center">
              <div className="text-[22px] font-bold text-ink leading-tight">{customerCount}</div>
              <div className="text-[14px] text-[#525151]">{customerLabel}</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs + dropdowns row */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={buildTabHref()}
            scroll={false}
            className={isAllTabsActive
              ? "inline-flex h-[40px] items-center justify-center rounded-full border-[1.5px] border-ink px-6 text-[13px] font-semibold text-ink"
              : "inline-flex h-[40px] items-center justify-center rounded-full border border-[#cfcfcf] px-6 text-[13px] font-normal text-[#525151] hover:bg-black/5"
            }
          >
            Shop
          </Link>
          {categoryTabs.map((t) => {
            const isActive = selectedTypeSlug === t.slug;
            return (
              <Link
                key={t.slug}
                href={buildTabHref(t.slug)}
                scroll={false}
                className={isActive
                  ? "inline-flex h-[40px] items-center justify-center rounded-full border-[1.5px] border-ink px-6 text-[13px] font-semibold text-ink"
                  : "inline-flex h-[40px] items-center justify-center rounded-full border border-[#cfcfcf] px-6 text-[13px] font-normal text-[#525151] hover:bg-black/5"
                }
              >
                {t.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <label className="relative inline-flex h-[40px] items-center gap-2 rounded-[10px] border border-[#e7e7e7] bg-white pl-4 pr-9 text-[13px] text-[#525151] cursor-pointer">
            {/* Grid icon */}
            <svg className="h-4 w-4 text-[#525151]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span>Show: {showCount}</span>
            <select
              value={showCount}
              onChange={(e) => setShowCount(Number(e.target.value) as 10 | 20 | 50 | 100)}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Show count"
            >
              <option value={10}>Show: 10</option>
              <option value={20}>Show: 20</option>
              <option value={50}>Show: 50</option>
              <option value={100}>Show: 100</option>
            </select>
            <svg className="absolute right-3 h-3.5 w-3.5 text-[#525151] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </label>
          <label className="relative inline-flex h-[40px] items-center gap-2 rounded-[10px] border border-[#e7e7e7] bg-white pl-4 pr-9 text-[13px] text-[#525151] cursor-pointer">
            {/* Sort icon */}
            <svg className="h-4 w-4 text-[#525151]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M6 12h12" />
              <path d="M9 18h6" />
            </svg>
            <span>Sort by: {sortBy === "featured" ? "Featured" : sortBy === "price-low" ? "Price ↑" : sortBy === "price-high" ? "Price ↓" : "Rating"}</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Sort by"
            >
              <option value="featured">Sort by: Featured</option>
              <option value="price-low">Sort by: Price (Low to High)</option>
              <option value="price-high">Sort by: Price (High to Low)</option>
              <option value="rating">Sort by: Rating</option>
            </select>
            <svg className="absolute right-3 h-3.5 w-3.5 text-[#525151] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </label>
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        {/* Sidebar */}
        <aside className="flex flex-col gap-6">
          <div className="rounded-[16px] border border-[#e7e7e7] bg-white p-5 flex flex-col gap-5">
            <div>
              <h3 className="text-[15px] font-bold text-ink mb-3">Fill by price</h3>
              <input
                type="range"
                min={0}
                max={10000}
                step={100}
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                className="w-full accent-brand-purple"
              />
              <div className="mt-2 flex items-center justify-between text-[12px]">
                <span className="text-[#8c8c8c]">From: <span className="font-semibold text-ink">₹0</span></span>
                <span className="text-[#8c8c8c]">To: <span className="font-semibold text-ink">₹{priceMax.toLocaleString("en-IN")}</span></span>
              </div>
            </div>

            {colorCounts.length > 0 && (
              <div>
                <h4 className="text-[14px] font-semibold text-ink mb-3">Color</h4>
                <div className="flex flex-col gap-2">
                  {colorCounts.map(([name, count]) => {
                    const checked = colorFilter.has(name);
                    return (
                      <label key={name} className="flex items-center gap-2 cursor-pointer text-[13px] text-[#525151] hover:text-ink">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setColorFilter((prev) => {
                              const next = new Set(prev);
                              if (checked) next.delete(name); else next.add(name);
                              return next;
                            });
                          }}
                          className="h-4 w-4 rounded border-[#cfcfcf]"
                        />
                        <span>{name} <span className="text-[#8c8c8c]">({count})</span></span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-[14px] font-semibold text-ink mb-3">Item Condition</h4>
              <div className="flex flex-col gap-2">
                {[
                  { name: "New", count: products.length },
                  { name: "Refurbished", count: 0 },
                  { name: "Used", count: 0 },
                ].map((c) => {
                  const checked = conditionFilter.has(c.name);
                  return (
                    <label key={c.name} className="flex items-center gap-2 cursor-pointer text-[13px] text-[#525151] hover:text-ink">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setConditionFilter((prev) => {
                            const next = new Set(prev);
                            if (checked) next.delete(c.name); else next.add(c.name);
                            return next;
                          });
                        }}
                        className="h-4 w-4 rounded border-[#cfcfcf]"
                      />
                      <span>{c.name} <span className="text-[#8c8c8c]">({c.count})</span></span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.refresh()}
              className="h-[44px] rounded-[10px] bg-brand-purple text-white text-[13px] font-bold hover:brightness-110 inline-flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filter
            </button>
          </div>
        </aside>

        {/* Grid */}
        <div>
          {filteredAndSorted.length === 0 ? (
            <div className="flex flex-col items-center gap-4 text-center py-20">
              <div className="text-[60px]">🛍️</div>
              <p className="text-[18px] font-semibold text-ink">No products found</p>
              <Link
                href="/products"
                className="inline-flex h-[42px] items-center justify-center rounded-full border border-[#cfcfcf] px-8 text-[13px] font-medium text-ink hover:bg-black/5"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredAndSorted.map((p) => {
                const sp = Number(p.special_price ?? 0);
                const rg = Number(p.price ?? 0);
                const cur = sp && rg && sp < rg ? sp : rg;
                const off = sp && rg && sp < rg ? Math.round(((rg - sp) / rg) * 100) : 0;
                return (
                  <Link
                    key={p.id}
                    href={`${BASE}/product/${p.id}`}
                    className="group relative flex flex-col overflow-hidden rounded-[12px] border border-[#e7e7e7] bg-white transition-all hover:shadow-md"
                  >
                    <div className="flex h-[200px] items-center justify-center bg-white p-3">
                      <ProductImage
                        src={getImg(p)}
                        alt={p.name}
                        className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <div className="px-3 py-2.5 flex flex-col gap-1 border-t border-[#f0f0f0]">
                      {p.category_name && (
                        <span className="text-[11px] text-[#8c8c8c]">{p.category_name}</span>
                      )}
                      <h3 className="text-[14px] font-semibold text-ink line-clamp-1 group-hover:underline">{p.name}</h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#8c8c8c]">
                        <Star className="h-3 w-3 text-[#f5a524]" />
                        <span>({Number(p.rating || 4).toFixed(1)})</span>
                      </div>
                      <span className="inline-flex w-fit items-center gap-1 rounded-[4px] bg-[#f6e8fb] px-2 py-0.5 text-[10px] font-semibold text-[#3E0149]">
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#3E0149]">
                          <IoCart className="h-2 w-2 text-[#FFE602]" />
                        </span>
                        By: SUVCRAFT
                      </span>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[14px] font-bold text-ink">{fmt(cur)}</span>
                          {off > 0 && <span className="text-[11px] text-[#8c8c8c] line-through">{fmt(rg)}</span>}
                        </div>
                        <button
                          type="button"
                          aria-label="Add to cart"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.location.href = `${BASE}/product/${p.id}`;
                          }}
                          className="inline-flex h-[28px] items-center justify-center gap-1 rounded-[6px] bg-[#3E0149] px-2.5 text-[11px] font-semibold text-white hover:brightness-110"
                        >
                          <IoCart className="h-3 w-3" />
                          Add
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
