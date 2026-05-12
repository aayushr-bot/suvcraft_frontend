"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type Slider, imgUrl } from "@/lib/api";
import { ChevronRight } from "./icons";

function resolveImg(path?: string): string {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("/figma/")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}

export default function Hero({ sliders = [] }: { sliders?: Slider[] }) {
  const [index, setIndex] = useState(0);

  // Auto-advance every 6 seconds when there's more than one slide.
  useEffect(() => {
    if (sliders.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % sliders.length), 6000);
    return () => clearInterval(t);
  }, [sliders.length]);

  if (!sliders.length) return null;

  const current = sliders[Math.min(index, sliders.length - 1)];
  const bgImage = resolveImg(current.bg_image);
  const productImg = resolveImg(current.image);
  const link = current.buy_now_link || "/";
  const hasNext = index < sliders.length - 1;
  const hasPrev = index > 0;

  // bg_color may be either a solid hex (`#FBE8C0`) or a CSS gradient
  // (`linear-gradient(...)` / `radial-gradient(...)`). Solid → use as
  // backgroundColor; gradient → layer it into backgroundImage so the bg
  // image (if any) sits on top.
  const rawBg = (current.bg_color || "").trim();
  const isGradient = /^(linear|radial)-gradient\(/i.test(rawBg);
  const layeredBgImage = [
    bgImage ? `url("${bgImage}")` : null,
    isGradient ? rawBg : null,
  ].filter(Boolean).join(", ") || undefined;

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-6 md:px-8">
      <div
        className="relative overflow-hidden rounded-[16px] md:rounded-[24px] min-h-[300px] md:min-h-[460px]"
        style={{
          backgroundColor: !isGradient ? (rawBg || "#FBE8C0") : undefined,
          backgroundImage: layeredBgImage,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Text column — bounded so it never overlaps the image */}
        <div className="relative z-10 flex max-w-[60%] flex-col gap-5 md:gap-8 px-6 py-8 sm:px-10 sm:py-10 md:px-32 md:py-20">
          {current.title && (
            <h1 className="font-sans text-[32px] sm:text-[44px] md:text-[80px] font-bold leading-[1.1] tracking-normal text-[#9B660C]">
              {current.title}
            </h1>
          )}
          {current.discount_text && (
            <p className="-mt-3 md:-mt-5 text-[20px] sm:text-[24px] md:text-[32px] font-bold text-ink">{current.discount_text}</p>
          )}
          {current.description && (
            <p className="text-[13px] sm:text-[15px] md:text-[18px] text-[#525151] leading-relaxed max-w-[520px]">
              {current.description}
            </p>
          )}
          {current.buy_now_text && (
            <Link
              href={link}
              style={{
                clipPath:
                  "polygon(0 0, 0 0, 100% 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 15px 100%, 0 100%)",
              }}
              className="inline-flex h-[44px] md:h-[48px] w-fit items-center justify-center gap-3 bg-black px-[28px] md:px-[40px] text-[14px] md:text-[18px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-white transition-all duration-300 ease-in hover:px-[36px] md:hover:px-[48px] hover:bg-[#1c1c1c]"
            >
              {current.buy_now_text}
            </Link>
          )}
        </div>

        {/* Image — anchored to the right edge of the banner on every breakpoint */}
        {productImg && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={productImg}
            alt={current.title || "Hero"}
            className="absolute right-2 sm:right-4 lg:right-16 bottom-0 h-full w-auto max-w-[38%] sm:max-w-[40%] md:max-w-[45%] lg:max-w-[50%] object-contain object-bottom pointer-events-none"
          />
        )}
      </div>

      {/* Slider controls */}
      {sliders.length > 1 && (
        <div className="mt-5 md:mt-8 flex items-center gap-2 md:gap-3">
          {/* Progress bar */}
          <div className="flex flex-1 items-center">
            <span
              className="h-[2px] rounded-full bg-[#525151] transition-all duration-300 ease-out"
              style={{ width: `${((index + 1) / sliders.length) * 100}%` }}
            />
            <span className="h-px flex-1 bg-[#cfcfcf]" />
          </div>

          {/* Hidden on mobile to save room for the arrow controls */}
          <Link
            href="/feature-work"
            className="hidden sm:inline-flex h-[36px] items-center justify-center rounded-full border border-[#cfcfcf] px-6 md:px-10 text-[12px] md:text-[13px] font-medium text-ink hover:border-ink hover:bg-black/5 transition-colors"
          >
            Feature Work
          </Link>

          {/* Prev / Next */}
          <button
            type="button"
            aria-label="Previous"
            disabled={!hasPrev}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="flex h-[36px] w-[36px] items-center justify-center rounded-full border border-[#cfcfcf] text-ink hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            aria-label="Next"
            disabled={!hasNext}
            onClick={() => setIndex((i) => Math.min(sliders.length - 1, i + 1))}
            className="flex h-[36px] w-[36px] items-center justify-center rounded-full border border-[#cfcfcf] text-ink hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}
