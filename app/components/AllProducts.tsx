"use client";
import { useRef } from "react";
import Link from "next/link";
import { BoltIcon, CartIcon, ChevronRight, HeartLine, Star, TagIcon } from "./icons";

const tabs = ["Shoes", "Clothing", "Accessories", "Jewellery"];

const products = [
  { img: "/figma/prod-tshirt.png" },
  { img: "/figma/prod-dress.png" },
  { img: "/figma/prod-bag.png" },
  { img: "/figma/prod-cap.png" },
  { img: "/figma/prod-dress.png" },
  { img: "/figma/prod-bag.png" },
  { img: "/figma/prod-tshirt.png" },
  { img: "/figma/prod-cap.png" },
  { img: "/figma/prod-bag.png" },
  { img: "/figma/prod-tshirt.png" },
  { img: "/figma/prod-dress.png" },
  { img: "/figma/prod-cap.png" },
  { img: "/figma/prod-tshirt.png" },
  { img: "/figma/prod-bag.png" },
  { img: "/figma/prod-dress.png" },
  { img: "/figma/prod-cap.png" },
];

const swatches = ["#d64545", "#245cbf", "#e5b83a"];
const CARD_WIDTH = 260 + 16; // width + gap

export default function AllProducts() {
  const containerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);

  function scroll(dir: -1 | 1) {
    const container = containerRef.current;
    if (!container) return;
    const maxScroll = container.scrollWidth - container.clientWidth;
    offsetRef.current = Math.max(0, Math.min(maxScroll, offsetRef.current + dir * CARD_WIDTH * 2));
    container.scrollTo({ left: offsetRef.current, behavior: "smooth" });
  }

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-12 md:px-8">
      <h2 className="font-sans text-[22px] font-semibold leading-tight text-ink md:text-[28px]">
        Our All Products
      </h2>
      <p className="mt-2 max-w-[340px] text-[13px] leading-[1.55] text-[#525151]">
        What is Lorem Ipsum? Lorem Ipsum is simply
        <br />
        dummy text of the
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {tabs.map((t, i) => (
          <button
            key={t}
            className={
              i === 1
                ? "inline-flex h-[40px] items-center justify-center rounded-full border-[1.5px] border-ink px-7 text-[13px] font-semibold text-ink"
                : "inline-flex h-[40px] items-center justify-center rounded-full border border-[#cfcfcf] px-7 text-[13px] font-normal text-[#525151] hover:bg-black/5"
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* Desktop arrow-driven scroll */}
      <div className="mt-8 hidden md:block">
        <div
          ref={containerRef}
          className="-mx-8 overflow-x-hidden pb-2 pl-8 pr-8"
          style={{ scrollbarWidth: "none" }}
        >
          <div
            className="grid auto-cols-[260px] grid-flow-col grid-rows-2 gap-4"
            style={{ width: "max-content" }}
          >
            {[...products, ...products].map((p, idx) => (
              <Link
                key={idx}
                href="/product"
                className="group relative flex flex-col overflow-hidden rounded-[18px] border border-[#e7e7e7] bg-paper transition-all hover:shadow-md"
                style={{ height: 360, width: 260 }}
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
                  <button type="button" aria-label="Favorite" className="relative z-10 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-paper text-ink ring-1 ring-[#e7e7e7]">
                    <HeartLine className="h-3.5 w-3.5 text-ink" />
                  </button>
                </div>

                <div className="relative flex flex-1 items-center justify-center px-4 pb-3 pt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt="Product" className="h-[180px] w-full object-contain group-hover:scale-105 transition-transform duration-300" />
                  <button type="button" aria-label="Add to cart" className="relative z-10 absolute right-3 top-1 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-ink-soft text-white">
                    <CartIcon className="h-3 w-3" />
                  </button>
                </div>

                <div className="border-t border-[#eeeeee] px-3 py-3 bg-white">
                  <h3 className="text-[12px] font-medium text-ink group-hover:underline">Black T shirt for men Cotton blend</h3>
                  <div className="mt-1 flex items-end gap-2">
                    <span className="text-[14px] font-semibold text-ink">$1200</span>
                    <span className="text-[12px] text-[#8c8c8c] line-through">$1300</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[12px] text-[#605e5e]">
                      <Star className="h-3 w-3 text-[#f5a524]" />
                      4.9
                    </span>
                    <div className="flex items-center gap-1.5">
                      {swatches.map((c) => (
                        <span key={c} className="h-[10px] w-[10px] rounded-full ring-1 ring-black/10" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile/tablet grid */}
      <div className="mt-8 grid grid-cols-2 gap-3 md:hidden sm:grid-cols-3">
        {products.map((p, idx) => (
          <Link key={idx} href="/product" className="relative flex flex-col overflow-hidden rounded-[18px] border border-[#e7e7e7] bg-paper active:scale-[0.98] transition-transform">
            <div className="flex items-start justify-between px-3 pt-3">
              <span className="inline-flex h-[22px] items-center gap-0.5 rounded-[6px] bg-chip px-1.5 text-[10px] font-medium text-white">
                <TagIcon className="h-2.5 w-2.5" />Offer
              </span>
              <button type="button" aria-label="Favorite" className="relative z-10 flex h-[24px] w-[24px] items-center justify-center rounded-full bg-paper text-ink ring-1 ring-[#e7e7e7]">
                <HeartLine className="h-3 w-3 text-ink" />
              </button>
            </div>
            <div className="flex items-center justify-center px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.img} alt="Product" className="h-[130px] w-full object-contain" />
            </div>
            <div className="border-t border-[#eeeeee] px-3 py-2">
              <h3 className="text-[11px] font-medium text-ink">Black T shirt for men</h3>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-ink">$1200</span>
                <span className="inline-flex items-center gap-0.5 text-[11px] text-[#605e5e]">
                  <Star className="h-2.5 w-2.5 text-[#f5a524]" />4.9
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 flex items-center gap-4">
        <div className="flex flex-1 items-center">
          <span className="h-[2px] w-1/4 rounded-full bg-ink-soft" />
          <span className="h-px flex-1 bg-[#cfcfcf]" />
        </div>
        <button
          type="button"
          className="inline-flex h-[40px] items-center justify-center rounded-full border border-[#cfcfcf] px-7 text-[13px] font-medium text-ink hover:bg-black/5"
        >
          Feature Work
        </button>
        <button
          type="button"
          aria-label="Previous"
          onClick={() => scroll(-1)}
          className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-[#cfcfcf] text-ink hover:bg-black/5"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => scroll(1)}
          className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-[#cfcfcf] text-ink hover:bg-black/5"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
