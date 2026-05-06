"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, imgUrl, type Product } from "@/lib/api";
import { ChevronRight, Star } from "./icons";
import ProductImage from "./ProductImage";

const PLACEHOLDER_IMG = "/product-placeholder.svg";
const SWATCHES = ["#d64545", "#1c1c1c", "#245cbf", "#e5b83a"];

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

function getPrice(p: Product) {
  const price = Number(p.price ?? 0);
  const special = Number(p.special_price ?? 0);
  if (special && price && special < price) return { price: fmt(special), original: fmt(price) };
  return { price: price ? fmt(price) : "—", original: "" };
}

export default function BuyTogether({
  excludeIds = [],
  title = "You Can Buy Together",
}: {
  excludeIds?: number[];
  title?: string;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch popular items, drop anything already in the cart, cap at 8.
  useEffect(() => {
    let cancelled = false;
    api.popularProducts({ limit: 12 })
      .then((res) => {
        if (cancelled) return;
        const filtered = (res.rows ?? []).filter((p) => !excludeIds.includes(p.id)).slice(0, 8);
        setProducts(filtered);
      })
      .catch(() => { if (!cancelled) setProducts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [excludeIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track scroll position so the arrows know when to disable.
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({ left: 0, max: 0, client: 0 });
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => {
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      setScroll({ left: el.scrollLeft, max, client: el.clientWidth });
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

  const hasPrev = scroll.left > 1;
  const hasNext = scroll.left + 1 < scroll.max;
  const canScroll = scroll.max > 0;

  function nudge(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const card = 240 + 16; // card width + gap
    const next = Math.max(0, Math.min(scroll.max, el.scrollLeft + dir * card * 2));
    el.scrollTo({ left: next, behavior: "smooth" });
  }

  if (loading) return null;
  if (products.length === 0) return null;

  return (
    <section className="mt-10">
      {/* 5px dash, 5px gap. Native border-style: dashed varies by browser, so
          we draw the dashes explicitly via a linear-gradient background. */}
      <div
        aria-hidden
        className="mb-10 h-px w-full"
        style={{
          backgroundImage: "linear-gradient(to right, #e7e7e7 50%, transparent 50%)",
          backgroundSize: "10px 1px",
          backgroundRepeat: "repeat-x",
        }}
      />
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[26px] font-bold text-ink md:text-[32px]">{title}</h2>
        {canScroll && (
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EEEEEE] p-1.5">
            <button
              type="button"
              aria-label="Previous"
              onClick={() => nudge(-1)}
              disabled={!hasPrev}
              className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-white text-ink shadow-sm hover:bg-[#fafafa] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4 rotate-180" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => nudge(1)}
              disabled={!hasNext}
              className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-white text-ink shadow-sm hover:bg-[#fafafa] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      <div
        ref={scrollerRef}
        className="mt-5 flex gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none" }}
      >
        {products.map((p) => {
          const { price, original } = getPrice(p);
          return (
            <Link
              key={p.id}
              href={`/product/${p.id}`}
              className="group flex w-[240px] shrink-0 flex-col"
            >
              <div className="relative h-[300px] w-full overflow-hidden rounded-[14px] border border-[#e7e7e7] bg-[#f9f9f9]">
                <ProductImage
                  src={getImg(p)}
                  alt={p.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </div>
              <div className="mt-2.5">
                <h3 className="text-[13px] font-medium text-ink line-clamp-1">{p.name}</h3>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[14px] font-bold text-ink">{price}</span>
                  {original && <span className="text-[12px] text-[#8c8c8c] line-through">{original}</span>}
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[12px] text-[#605e5e]">
                    <Star className="h-3 w-3 text-[#f5a524]" />
                    {Number(p.rating ?? 0) > 0 ? Number(p.rating).toFixed(1) : "4.5"}
                  </span>
                  <div className="flex items-center gap-1">
                    {SWATCHES.map((c) => (
                      <span
                        key={c}
                        className="h-[10px] w-[10px] rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
