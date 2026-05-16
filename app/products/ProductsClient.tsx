"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { IoCart } from "react-icons/io5";
import ProductImage from "../components/ProductImage";
import { type Product, type CategoryTab, type SiteSettings, type Brand, imgUrl } from "@/lib/api";
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
  brands = [],
  filters: serverFilters,
}: {
  products: Product[];
  categoryTabs: CategoryTab[];
  selectedTypeSlug?: string;
  q?: string;
  categoryId?: string;
  settings: SiteSettings;
  brands?: Brand[];
  filters?: {
    brandId?: string;
    priceMin?: string;
    priceMax?: string;
    inStock?: string;
    sort?: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Updates the URL with a patched set of query params and lets the server
  // re-render the page with the new filtered product list. Skips routing
  // when the patched value matches the existing one to avoid no-op pushes.
  // Empty string / null clears the param.
  function setUrl(patch: Record<string, string | null | undefined>) {
    const sp = new URLSearchParams(searchParams?.toString() || '');
    let changed = false;
    for (const [k, v] of Object.entries(patch)) {
      const next = v == null || v === '' ? null : String(v);
      const prev = sp.get(k);
      if (next === prev) continue;
      if (next == null) sp.delete(k); else sp.set(k, next);
      changed = true;
    }
    if (!changed) return;
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  // Slider thumbs maintain their own local state during drag so the URL
  // doesn't churn 40 times per drag. We commit to the URL once on release
  // (debounced via the timer in the effect below).
  const initialMin = Number(serverFilters?.priceMin) || 0;
  const initialMax = Number(serverFilters?.priceMax) || 10000;
  const [priceMin, setPriceMin] = useState<number>(initialMin);
  const [priceMax, setPriceMax] = useState<number>(initialMax);
  // Keep local sliders in sync if the URL changes externally (back/forward).
  useEffect(() => {
    setPriceMin(Number(serverFilters?.priceMin) || 0);
    setPriceMax(Number(serverFilters?.priceMax) || 10000);
  }, [serverFilters?.priceMin, serverFilters?.priceMax]);

  // Debounce slider → URL commits. Ignores the first run after mount so we
  // don't redundantly push the same values we just received from the server.
  const skipFirstPriceCommit = useRef(true);
  useEffect(() => {
    if (skipFirstPriceCommit.current) { skipFirstPriceCommit.current = false; return; }
    const t = setTimeout(() => {
      setUrl({
        price_min: priceMin > 0 ? String(priceMin) : null,
        price_max: priceMax < 10000 ? String(priceMax) : null,
      });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceMin, priceMax]);

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  // Color and condition filters are still client-side (backend doesn't index
  // them yet) — they post-filter whatever the server returned.
  const [colorFilter, setColorFilter] = useState<Set<string>>(new Set());
  const [conditionFilter, setConditionFilter] = useState<Set<string>>(new Set());
  const [showCount, setShowCount] = useState<10 | 20 | 50 | 100>(50);
  // Sort + in-stock + brand are URL-driven so they survive refresh / share.
  const sortBy = (serverFilters?.sort || 'newest') as 'newest' | 'oldest' | 'price-low' | 'price-high' | 'rating' | 'popularity';
  const brandId = serverFilters?.brandId || '';
  const inStockOnly = String(serverFilters?.inStock) === '1';

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

  // Server already filtered by price / brand / in-stock / sort and returned
  // products in the requested order. We just post-filter for the things the
  // backend doesn't index (colour, condition) and cap the visible count.
  const filteredAndSorted = useMemo(() => {
    let list = [...products];
    if (colorFilter.size > 0) {
      list = list.filter((p) => {
        const colors = (p as Product & { colors?: { value: string }[] }).colors || [];
        return colors.some((c) => colorFilter.has(String(c.value).trim()));
      });
    }
    if (conditionFilter.size > 0) {
      list = list.filter((p) => {
        const cond = (p as Product & { condition?: string }).condition || "New";
        return conditionFilter.has(cond);
      });
    }
    return list.slice(0, showCount);
  }, [products, colorFilter, conditionFilter, showCount]);

  const avatars = [
    settings.products_avatar_1,
    settings.products_avatar_2,
    settings.products_avatar_3,
  ].filter((s): s is string => Boolean(s && s.trim()));
  const customerCount = (settings.products_customer_count || "").trim();
  const customerLabel = (settings.products_customer_label || "").trim();
  const showCustomerBlock = avatars.length > 0 && customerCount.length > 0;

  // Shared filter card — rendered both in the desktop sidebar and the mobile
  // off-canvas drawer. Buttons close the drawer when present so a tap on the
  // primary CTA also dismisses it on small screens.
  const filterCard = (
    <div className="rounded-[16px] border border-[#e7e7e7] bg-white p-5 flex flex-col gap-5">
      <div>
        <h3 className="text-[15px] font-bold text-ink mb-4">Fill by price</h3>
        <div className="relative mb-5 h-[4px] bg-[#e7e7e7] rounded-full">
          <span className="absolute left-0 top-0 h-[4px] w-[60px] bg-[#BCE3C9] rounded-full" />
        </div>
        {(() => {
          const SLIDER_MIN = 0;
          const SLIDER_MAX = 10000;
          const STEP = 100;
          const minPct = ((priceMin - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;
          const maxPct = ((priceMax - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;
          return (
            <>
              <div className="relative h-6 select-none">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] rounded-full bg-[#e7e7e7]" />
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-[6px] rounded-full bg-[#3E0149]"
                  style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
                />
                <input
                  type="range"
                  min={SLIDER_MIN}
                  max={SLIDER_MAX}
                  step={STEP}
                  value={priceMin}
                  onChange={(e) => {
                    const next = Math.min(Number(e.target.value), priceMax - STEP);
                    setPriceMin(next);
                  }}
                  aria-label="Minimum price"
                  className="dual-range absolute inset-0 w-full appearance-none bg-transparent pointer-events-none"
                />
                <input
                  type="range"
                  min={SLIDER_MIN}
                  max={SLIDER_MAX}
                  step={STEP}
                  value={priceMax}
                  onChange={(e) => {
                    const next = Math.max(Number(e.target.value), priceMin + STEP);
                    setPriceMax(next);
                  }}
                  aria-label="Maximum price"
                  className="dual-range absolute inset-0 w-full appearance-none bg-transparent pointer-events-none"
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-[12px]">
                <span className="text-[#8c8c8c]">From: <span className="font-semibold text-ink">₹{priceMin.toLocaleString("en-IN")}</span></span>
                <span className="text-[#8c8c8c]">To: <span className="font-semibold text-ink">₹{priceMax.toLocaleString("en-IN")}</span></span>
              </div>
              <style jsx>{`
                .dual-range::-webkit-slider-thumb {
                  appearance: none;
                  pointer-events: auto;
                  width: 20px;
                  height: 20px;
                  border-radius: 9999px;
                  background: #3E0149;
                  border: 0;
                  box-shadow: 0 1px 4px rgba(0,0,0,0.25);
                  cursor: pointer;
                }
                .dual-range::-moz-range-thumb {
                  pointer-events: auto;
                  width: 20px;
                  height: 20px;
                  border-radius: 9999px;
                  background: #3E0149;
                  border: 0;
                  box-shadow: 0 1px 4px rgba(0,0,0,0.25);
                  cursor: pointer;
                }
                .dual-range::-webkit-slider-runnable-track { background: transparent; }
                .dual-range::-moz-range-track { background: transparent; }
              `}</style>
            </>
          );
        })()}
      </div>

      {colorCounts.length > 0 && (
        <div>
          <h4 className="text-[14px] font-semibold text-ink mb-3">Color</h4>
          <div className="flex flex-col gap-3">
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
        <div className="flex flex-col gap-3">
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
        onClick={() => setMobileFilterOpen(false)}
        className="h-[44px] rounded-[10px] bg-brand-purple text-white text-[13px] font-bold hover:brightness-110 inline-flex items-center justify-center gap-2"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        Filter
      </button>
    </div>
  );

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(179.62deg, #FFF6DE 0.33%, #FFFFFF 12.73%)" }}
    >
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-3 pb-10 md:px-8 md:pt-10">
      {/* Top heading row */}
      <div className="flex items-start justify-between gap-4 md:items-end md:justify-between mb-6 md:mb-8">
        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] md:text-[40px] font-bold text-ink leading-tight">
            {(settings.products_title || "").trim() || "Our All Products"}
          </h1>
          {((settings.products_description || "").trim() || "What is Lorem Ipsum? Lorem Ipsum is simply dummy text of the") && (
            <p className="mt-1.5 md:mt-2 text-[12px] md:text-[14px] text-[#8c8c8c] max-w-[400px]">
              {(settings.products_description || "").trim() || "What is Lorem Ipsum? Lorem Ipsum is simply dummy text of the"}
            </p>
          )}
        </div>
        {/* Mobile-only filter trigger */}
        <button
          type="button"
          onClick={() => setMobileFilterOpen(true)}
          aria-label="Open filters"
          className="md:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#e7e7e7] bg-white text-[#525151]"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
        </button>
        {showCustomerBlock && (
          <div className="hidden md:flex flex-col items-center gap-2">
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6 md:mb-8">
        {/* Mobile: underline tabs with horizontal scroll */}
        <div className="md:hidden -mx-4 overflow-x-auto border-b border-[#e7e7e7]" style={{ scrollbarWidth: "none" }}>
          <div className="flex items-center gap-6 px-4 whitespace-nowrap">
            <Link
              href={buildTabHref()}
              scroll={false}
              className={`relative pb-2.5 text-[14px] ${isAllTabsActive ? "font-semibold text-ink" : "font-normal text-[#8c8c8c]"}`}
            >
              All
              {isAllTabsActive && <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-ink" />}
            </Link>
            {categoryTabs.map((t) => {
              const isActive = selectedTypeSlug === t.slug;
              return (
                <Link
                  key={t.slug}
                  href={buildTabHref(t.slug)}
                  scroll={false}
                  className={`relative pb-2.5 text-[14px] ${isActive ? "font-semibold text-ink" : "font-normal text-[#8c8c8c]"}`}
                >
                  {t.label}
                  {isActive && <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-ink" />}
                </Link>
              );
            })}
          </div>
        </div>
        {/* Desktop: pill tabs */}
        <div className="hidden md:flex flex-wrap items-center gap-3">
          <Link
            href={buildTabHref()}
            scroll={false}
            className={isAllTabsActive
              ? "inline-flex h-[40px] items-center justify-center rounded-full border-[1.5px] border-ink px-6 text-[13px] font-semibold text-ink"
              : "inline-flex h-[40px] items-center justify-center rounded-full border border-[#cfcfcf] px-6 text-[13px] font-normal text-[#525151] hover:bg-black/5"
            }
          >
            All
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
        <div className="hidden md:flex items-center gap-3">
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
            <span>Sort by: {
              sortBy === "newest" ? "Newest" :
              sortBy === "oldest" ? "Oldest" :
              sortBy === "price-low" ? "Price ↑" :
              sortBy === "price-high" ? "Price ↓" :
              sortBy === "popularity" ? "Popularity" :
              sortBy === "rating" ? "Rating" : "Newest"
            }</span>
            <select
              value={sortBy}
              onChange={(e) => setUrl({ sort: e.target.value === 'newest' ? null : e.target.value })}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Sort by"
            >
              <option value="newest">Sort by: Newest</option>
              <option value="oldest">Sort by: Oldest</option>
              <option value="popularity">Sort by: Popularity</option>
              <option value="rating">Sort by: Rating</option>
              <option value="price-low">Sort by: Price (Low to High)</option>
              <option value="price-high">Sort by: Price (High to Low)</option>
            </select>
            <svg className="absolute right-3 h-3.5 w-3.5 text-[#525151] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </label>
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        {/* Sidebar — desktop only */}
        <aside className="hidden lg:flex flex-col gap-6">
          {filterCard}
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
                      <div className="inline-flex w-fit items-center gap-1.5 text-[11px] text-[#525151]">
                        <span>By</span>
                        <span className="inline-flex items-center rounded-[4px] bg-[#f6e8fb] px-1.5 py-0.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/figma/suvcraft-logo2.png" alt="SUVCRAFT" className="h-4 object-contain" />
                        </span>
                      </div>
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
                          className="inline-flex h-[28px] sm:h-[34px] items-center justify-center gap-1 sm:gap-1.5 rounded-[4px] bg-[#3E0149] px-2.5 sm:px-3.5 text-[11px] sm:text-[12px] font-semibold text-white hover:brightness-110"
                        >
                          <IoCart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
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

      {/* Mobile filter drawer */}
      {mobileFilterOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-[100] bg-black/40"
            onClick={() => setMobileFilterOpen(false)}
          />
          <aside className="lg:hidden fixed right-0 top-0 z-[101] flex h-full w-[88%] max-w-[360px] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#eee] px-5 py-4">
              <h2 className="text-[16px] font-bold text-ink">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                aria-label="Close filters"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#525151] hover:bg-[#f5f5f5]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              {/* Mobile-only Show + Sort dropdowns (hidden in desktop header) */}
              <div className="grid grid-cols-2 gap-2">
                <label className="relative flex h-[40px] items-center gap-2 rounded-[10px] border border-[#e7e7e7] bg-white pl-3 pr-7 text-[12px] text-[#525151] cursor-pointer">
                  <svg className="h-4 w-4 shrink-0 text-[#525151]" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="1" y="1" width="6" height="6" rx="1" />
                    <rect x="9" y="1" width="6" height="6" rx="1" />
                    <rect x="1" y="9" width="6" height="6" rx="1" />
                    <rect x="9" y="9" width="6" height="6" rx="1" />
                  </svg>
                  <span className="truncate">Show: {showCount}</span>
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
                  <svg className="absolute right-2 h-3 w-3 text-[#525151] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                </label>
                <label className="relative flex h-[40px] items-center gap-2 rounded-[10px] border border-[#e7e7e7] bg-white pl-3 pr-7 text-[12px] text-[#525151] cursor-pointer">
                  <svg className="h-4 w-4 shrink-0 text-[#525151]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M2 4h12" />
                    <path d="M4 8h8" />
                    <path d="M6 12h4" />
                  </svg>
                  <span className="truncate">{
                    sortBy === "newest" ? "Newest" :
                    sortBy === "oldest" ? "Oldest" :
                    sortBy === "price-low" ? "Price ↑" :
                    sortBy === "price-high" ? "Price ↓" :
                    sortBy === "popularity" ? "Popularity" :
                    sortBy === "rating" ? "Rating" : "Newest"
                  }</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setUrl({ sort: e.target.value === 'newest' ? null : e.target.value })}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    aria-label="Sort by"
                  >
                    <option value="newest">Sort by: Newest</option>
                    <option value="oldest">Sort by: Oldest</option>
                    <option value="popularity">Sort by: Popularity</option>
                    <option value="rating">Sort by: Rating</option>
                    <option value="price-low">Sort by: Price (Low to High)</option>
                    <option value="price-high">Sort by: Price (High to Low)</option>
                  </select>
                  <svg className="absolute right-2 h-3 w-3 text-[#525151] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                </label>
              </div>
              {filterCard}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
