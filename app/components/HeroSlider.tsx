"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, HeartFill, HeartLine } from "./icons";
import { type Slider, imgUrl } from "@/lib/api";

function heroImg(path: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/figma/")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}

function resolveSliderLink(s: Slider): string {
  if (s.buy_now_link?.trim()) return s.buy_now_link.trim();
  if (s.type === "products" && s.type_id) return `/product/${s.type_id}`;
  if (s.type === "categories" && s.type_id) return `/?category_id=${s.type_id}`;
  if (s.type === "sliderurl" && s.link) return s.link;
  return "";
}

function SliderCard({ s }: { s: Slider }) {
  const [liked, setLiked] = useState(false);
  const linkHref = resolveSliderLink(s);

  async function toggleLike(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const newLiked = !liked;
    setLiked(newLiked);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/api/v1/sliders/like`,
        {
          method: newLiked ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ slider_id: s.id }),
        }
      );
    } catch {
      setLiked(!newLiked);
    }
  }

  const card = (
    <article
      className="group relative overflow-hidden rounded-[16px] bg-[#d9d9d9] ring-1 ring-black/5 transition-transform hover:shadow-md"
      style={{ height: 290 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={heroImg(s.image)}
        alt={s.product_name || s.name || ""}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />

      <button
        type="button"
        aria-label={liked ? "Unlike" : "Like"}
        onClick={toggleLike}
        className="absolute left-3 top-3 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-paper text-ink shadow-sm transition-transform active:scale-90"
      >
        {liked ? (
          <HeartFill className="h-4 w-4 text-red-500" />
        ) : (
          <HeartLine className="h-4 w-4 text-ink" />
        )}
      </button>

      <span className="absolute right-3 top-3 inline-flex h-[32px] items-center justify-center rounded-[20px] bg-paper px-4 text-[13px] font-medium text-[#707070] shadow-sm">
        {s.buy_now_text || "Buy Now"}
      </span>

      {s.discount_text && (
        <div className="absolute bottom-3 left-3 h-[52px] w-[150px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/figma/Rectangle 3463565.png"
            alt=""
            className="absolute inset-0 h-full w-full object-contain object-left-bottom"
          />
          <div className="relative z-10 flex h-full w-[130px] items-center justify-start pl-3 text-left text-[14px] font-medium leading-[1.2] text-[#292929]">
            {s.discount_text}
          </div>
        </div>
      )}

      {(s.product_name || s.category_name) && (
        <div className="absolute bottom-3 right-3 max-w-[160px] truncate rounded-[8px] bg-white/90 backdrop-blur-sm px-3 py-1.5 text-[12px] font-semibold text-ink shadow-sm">
          {s.product_name || s.category_name}
        </div>
      )}
    </article>
  );

  return linkHref ? (
    <Link href={linkHref} className="block focus:outline-none focus:ring-2 focus:ring-brand-purple rounded-[16px]">
      {card}
    </Link>
  ) : card;
}

const VISIBLE_COUNT = 3;

export default function HeroSlider({ sliders }: { sliders: Slider[] }) {
  const [offset, setOffset] = useState(0);

  // Pages advance in fixed steps of VISIBLE_COUNT. With 4 sliders that's
  // [1,2,3] then [4] — clamping to length-VISIBLE_COUNT instead would give
  // [1,2,3] then [2,3,4], which isn't what the carousel should do.
  const totalPages = Math.max(1, Math.ceil(sliders.length / VISIBLE_COUNT));
  const maxOffset = (totalPages - 1) * VISIBLE_COUNT;
  const visible = sliders.slice(offset, offset + VISIBLE_COUNT);
  const hasNext = offset < maxOffset;
  const hasPrev = offset > 0;

  function next() {
    setOffset((prev) => Math.min(prev + VISIBLE_COUNT, maxOffset));
  }

  function prev() {
    setOffset((prev) => Math.max(prev - VISIBLE_COUNT, 0));
  }

  // Progress = "how far through the list have we revealed?" Using
  // (offset + VISIBLE_COUNT) / total works for any list length, including
  // ones where offset isn't a clean multiple (e.g. 5 sliders → maxOffset=2,
  // and the old "page index" math stayed at page 1 in both states).
  const showFooter = sliders.length > VISIBLE_COUNT;
  const progressPct = sliders.length === 0
    ? 100
    : Math.min(100, Math.round(((offset + VISIBLE_COUNT) / sliders.length) * 100));

  // translateX moves the track left by `offset` cards. Each card is
  // (100/VISIBLE_COUNT)% wide so exactly VISIBLE_COUNT cards fit in the
  // viewport at any offset. Mobile (< sm) shows 1 card, tablet shows 2.
  const trackTransform = `translateX(-${(offset / VISIBLE_COUNT) * 100}%)`;

  return (
    <div className="mt-8">
      <div className="relative">
        {hasPrev && (
          <button
            type="button"
            aria-label="Previous"
            onClick={prev}
            className="absolute left-0 top-1/2 z-10 flex h-[64px] w-[64px] -translate-y-1/2 items-center justify-center rounded-full bg-[#d9d9d9] text-ink hover:bg-[#c9c9c9] transition-colors"
          >
            <ArrowRight className="h-4 w-4 rotate-180" strokeWidth={1.4} />
          </button>
        )}

        {/* Use margin instead of padding so the overflow-hidden box itself
            shrinks to exclude the arrow zones — padding doesn't clip and was
            letting the 4th card bleed under the right arrow. */}
        <div className={`overflow-hidden ${hasPrev ? "md:ml-20" : ""} ${hasNext ? "md:mr-28" : ""}`}>
          {/* The track uses clean fractional widths (w-full / 1/2 / 1/3) and
              creates the visual gap with px-2 inside each item, so the math
              is exact: 3 items × 33.333% = 100%, no overflow. */}
          <div
            className="-mx-2 flex transition-transform duration-500 ease-out"
            style={{ transform: trackTransform }}
          >
            {sliders.map((s) => (
              <div key={s.id} className="w-full shrink-0 px-2 sm:w-1/2 md:w-1/3">
                <SliderCard s={s} />
              </div>
            ))}
          </div>
        </div>

        {hasNext && (
          <button
            type="button"
            aria-label="Next"
            onClick={next}
            className="absolute right-0 top-1/2 flex h-[64px] w-[64px] -translate-y-1/2 items-center justify-center rounded-full bg-[#d9d9d9] text-ink hover:bg-[#c9c9c9] transition-colors"
          >
            <ArrowRight className="h-4 w-4" strokeWidth={1.4} />
          </button>
        )}
      </div>

      {showFooter && (
        <div className="mt-10 flex items-center gap-4">
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
            onClick={prev}
            disabled={!hasPrev}
            className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-[#cfcfcf] text-ink hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={next}
            disabled={!hasNext}
            className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-[#cfcfcf] text-ink hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
