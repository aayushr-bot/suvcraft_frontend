"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BoltIcon, ChevronRight, HeartFill, HeartLine, Star, TagIcon } from "./icons";
import ProductImage from "./ProductImage";
import { type Product, type Category, type CategoryTab, imgUrl } from "@/lib/api";
import { useWishlist } from "@/lib/wishlistContext";

const PLACEHOLDER_IMG = "/product-placeholder.svg";
// <Link> auto-prefixes basePath, but window.location.href does NOT.
// Read NEXT_PUBLIC_BASE_PATH so raw browser navigations stay correct.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

function getImg(p: Product) {
  if (!p.image) return PLACEHOLDER_IMG;
  if (p.image.startsWith("http")) return p.image;
  if (p.image.startsWith("/figma/")) return p.image;
  const clean = p.image.startsWith("/uploads/") ? p.image.slice("/uploads/".length) : p.image.replace(/^\//, "");
  return imgUrl(clean);
}

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function getPrice(p: Product) {
  const price = Number(p.price ?? 0);
  const special = Number(p.special_price ?? 0);
  if (special && price && special < price) return { price: fmt(special), original: fmt(price), raw: special };
  return { price: price ? fmt(price) : "—", original: "", raw: price };
}

const swatches = ["#d64545", "#245cbf", "#e5b83a"];
const CARD_WIDTH = 260 + 16;

export default function AllProducts({
  products,
  categories,
  categoryTabs = [],
  selectedCategoryId,
  selectedTypeSlug,
}: {
  products: Product[];
  categories: Category[];
  categoryTabs?: CategoryTab[];
  selectedCategoryId?: number;
  selectedTypeSlug?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wishlist = useWishlist();

  const toggleFav = (e: React.MouseEvent, p: Product) => {
    // Don't navigate when the heart is clicked.
    e.stopPropagation();
    e.preventDefault();
    wishlist.toggle({
      id: p.id,
      name: p.name,
      image: p.image,
      slug: p.slug,
      price: Number(p.special_price ?? 0) || Number(p.price ?? 0),
      list_price: Number(p.price ?? 0) || undefined,
      status: p.status,
    });
  };

  // Track current scroll position so the progress bar fills, prev/next can
  // disable at the edges, and the footer row can hide when no scrolling is
  // needed at all. Re-measure on resize / content change.
  const [scrollState, setScrollState] = useState({ left: 0, max: 0, client: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      setScrollState({ left: el.scrollLeft, max, client: el.clientWidth });
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [products.length]);

  const canScroll = scrollState.max > 0;
  const hasPrev = scrollState.left > 1;
  const hasNext = scrollState.left + 1 < scrollState.max;
  // Bar fills as you scroll: fraction of total content revealed so far.
  const totalContent = scrollState.max + scrollState.client;
  const progressPct = totalContent > 0
    ? Math.min(100, Math.round(((scrollState.left + scrollState.client) / totalContent) * 100))
    : 100;

  // Pills filter by category tab. Category itself is set via the navbar
  // (?category_id=…), and the two compose — clicking a tab keeps the active
  // category in the URL.
  const isAllTabsActive = !selectedTypeSlug;
  const baseQuery = selectedCategoryId ? `category_id=${selectedCategoryId}` : "";
  const buildHref = (tabSlug?: string) => {
    const params = new URLSearchParams(baseQuery);
    if (tabSlug) params.set("type", tabSlug);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  function scroll(dir: -1 | 1) {
    const container = containerRef.current;
    if (!container) return;
    // Advance by a "page" — as many cards (in a single row) as currently fit
    // in the viewport. Round down so we always land on a clean column edge.
    const colsPerPage = Math.max(1, Math.floor(container.clientWidth / CARD_WIDTH));
    const pageWidth = colsPerPage * CARD_WIDTH;
    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    const next = Math.max(0, Math.min(maxScroll, container.scrollLeft + dir * pageWidth));
    container.scrollTo({ left: next, behavior: "smooth" });
  }

  const activeCategory = selectedCategoryId
    ? categories.find((c) => c.id === Number(selectedCategoryId))
    : null;

  return (
    <section id="all-products" className="mx-auto w-full max-w-[1440px] px-4 pt-12 md:px-8 scroll-mt-24">
      <h2 className="font-sans text-[22px] font-semibold leading-tight text-ink md:text-[28px]">
        {activeCategory ? activeCategory.name : "Our All Products"}
      </h2>
      <p className="mt-2 max-w-[340px] text-[13px] leading-[1.55] text-[#525151]">
        {activeCategory
          ? `Browse all products in ${activeCategory.name}.`
          : "Browse our complete collection of premium bags and accessories."}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href={buildHref()}
          scroll={false}
          className={isAllTabsActive
            ? "inline-flex h-[40px] items-center justify-center rounded-full border-[1.5px] border-ink px-7 text-[13px] font-semibold text-ink"
            : "inline-flex h-[40px] items-center justify-center rounded-full border border-[#cfcfcf] px-7 text-[13px] font-normal text-[#525151] hover:bg-black/5"
          }
        >
          All
        </Link>
        {categoryTabs.map((t) => {
          const isActive = selectedTypeSlug === t.slug;
          return (
            <Link
              key={t.slug}
              href={buildHref(t.slug)}
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

      {/* Empty state */}
      {products.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="text-[60px]">🛍️</div>
          <p className="text-[18px] font-semibold text-ink">No products found</p>
          <Link href="/" className="inline-flex h-[42px] items-center justify-center rounded-full border border-[#cfcfcf] px-8 text-[13px] font-medium text-ink hover:bg-black/5">
            View All Products
          </Link>
        </div>
      )}

      {/* Desktop arrow-driven scroll */}
      {products.length > 0 && <div className="mt-8 hidden md:block">
        <div
          ref={containerRef}
          className="-mx-8 overflow-x-auto pb-2 pl-8 pr-8"
          style={{ scrollbarWidth: "none" }}
        >
          <div
            className="grid auto-cols-[260px] grid-flow-col grid-rows-2 gap-4"
            style={{ width: "max-content" }}
          >
            {products.map((p) => (
              <div
                key={p.id}
                className="group relative flex flex-col overflow-hidden rounded-[18px] border border-[#e7e7e7] bg-paper transition-all hover:shadow-md cursor-pointer"
                style={{ height: 360, width: 260 }}
                onClick={() => { window.location.href = `${BASE}/product/${p.id}`; }}
              >
                <div className="flex items-start justify-between px-3 pt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex h-[24px] items-center gap-1 rounded-[6px] bg-chip px-2 text-[11px] font-medium text-white">
                      <TagIcon className="h-3 w-3" />
                      Offer
                    </span>
                    <span className="inline-flex h-[24px] items-center gap-1 rounded-[6px] bg-chip px-2 text-[11px] font-medium text-white">
                      <BoltIcon className="h-3 w-3" />
                      Bestseller
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={wishlist.has(p.id) ? "Remove from wishlist" : "Add to wishlist"}
                    aria-pressed={wishlist.has(p.id)}
                    onClick={(e) => toggleFav(e, p)}
                    className="relative z-10 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-paper ring-1 ring-[#e7e7e7] hover:ring-ink transition-all"
                  >
                    {wishlist.has(p.id)
                      ? <HeartFill className="h-3.5 w-3.5 text-red-500" />
                      : <HeartLine className="h-3.5 w-3.5 text-ink" />}
                  </button>
                </div>

                <div className="relative flex flex-1 items-center justify-center px-4 pb-3 pt-2">
                  <ProductImage src={getImg(p)} alt={p.name} className="h-[180px] w-full object-contain group-hover:scale-105 transition-transform duration-300" />
                </div>

                <div className="border-t border-[#eeeeee] px-3 py-3 bg-white">
                  <h3 className="text-[12px] font-medium text-ink group-hover:underline">{p.name}</h3>
                  <div className="mt-1 flex items-end gap-2">
                    <span className="text-[14px] font-semibold text-ink">{getPrice(p).price}</span>
                    <span className="text-[12px] text-[#8c8c8c] line-through">{getPrice(p).original}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[12px] text-[#605e5e]">
                      <Star className="h-3 w-3 text-[#f5a524]" />
                      {p.rating ?? "4.9"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {swatches.map((c) => (
                        <span key={c} className="h-[10px] w-[10px] rounded-full ring-1 ring-black/10" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>}

      {/* Mobile/tablet grid */}
      {products.length > 0 && <div className="mt-8 grid grid-cols-2 gap-3 md:hidden sm:grid-cols-3">
        {products.map((p) => (
          <div
            key={p.id}
            className="relative flex flex-col overflow-hidden rounded-[18px] border border-[#e7e7e7] bg-paper active:scale-[0.98] transition-transform cursor-pointer"
            onClick={() => { window.location.href = `${BASE}/product/${p.id}`; }}
          >
            <div className="flex items-start justify-between px-3 pt-3">
              <span className="inline-flex h-[22px] items-center gap-0.5 rounded-[6px] bg-chip px-1.5 text-[10px] font-medium text-white">
                <TagIcon className="h-2.5 w-2.5" />Offer
              </span>
              <button
                type="button"
                aria-label={wishlist.has(p.id) ? "Remove from wishlist" : "Add to wishlist"}
                aria-pressed={wishlist.has(p.id)}
                onClick={(e) => toggleFav(e, p)}
                className="relative z-10 flex h-[24px] w-[24px] items-center justify-center rounded-full bg-paper ring-1 ring-[#e7e7e7] hover:ring-ink transition-all"
              >
                {wishlist.has(p.id)
                  ? <HeartFill className="h-3 w-3 text-red-500" />
                  : <HeartLine className="h-3 w-3 text-ink" />}
              </button>
            </div>
            <div className="flex items-center justify-center px-3 py-2">
              <ProductImage src={getImg(p)} alt={p.name} className="h-[130px] w-full object-contain" />
            </div>
            <div className="border-t border-[#eeeeee] px-3 py-2">
              <h3 className="text-[11px] font-medium text-ink">{p.name}</h3>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-ink">{getPrice(p).price}</span>
                <span className="inline-flex items-center gap-0.5 text-[11px] text-[#605e5e]">
                  <Star className="h-2.5 w-2.5 text-[#f5a524]" />{p.rating ?? "4.9"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>}

      {canScroll && (
        <div className="mt-10 hidden md:flex items-center gap-4">
          <div className="flex flex-1 items-center">
            <span
              className="h-[2px] rounded-full bg-ink-soft transition-[width] duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
            <span className="h-px flex-1 bg-[#cfcfcf]" />
          </div>
          <Link
            href="/products"
            className="inline-flex h-[40px] items-center justify-center rounded-full border border-[#cfcfcf] px-7 text-[13px] font-medium text-ink hover:bg-black/5"
          >
            View All Products
          </Link>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => scroll(-1)}
            disabled={!hasPrev}
            className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-[#cfcfcf] text-ink hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => scroll(1)}
            disabled={!hasNext}
            className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-[#cfcfcf] text-ink hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}
