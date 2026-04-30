"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, HeartFill, HeartLine } from "./icons";
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

export default function HeroSlider({ sliders }: { sliders: Slider[] }) {
  const [offset, setOffset] = useState(0);

  const visible = sliders.slice(offset, offset + 3);
  const hasNext = offset + 3 < sliders.length;
  const hasPrev = offset > 0;

  function next() {
    setOffset((prev) => Math.min(prev + 3, sliders.length - 1));
  }

  function prev() {
    setOffset((prev) => Math.max(prev - 3, 0));
  }

  return (
    <div className="relative mt-8">
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

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-[1.68fr_1fr_1fr] ${hasPrev ? "md:pl-20" : ""} ${hasNext ? "md:pr-28" : ""}`}>
        {visible.map((s) => (
          <SliderCard key={s.id} s={s} />
        ))}
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
  );
}
