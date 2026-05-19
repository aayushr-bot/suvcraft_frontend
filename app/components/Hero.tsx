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
        className="relative overflow-hidden rounded-[16px] md:rounded-[24px] aspect-[2/1] md:aspect-auto md:min-h-[460px]"
        style={{
          backgroundColor: !isGradient ? (rawBg || "#FBE8C0") : undefined,
          backgroundImage: layeredBgImage,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Text column — sized smaller on mobile so the banner stays in
            the reference's ~2:1 aspect and the model image on the right
            fills its full column instead of shrinking to a corner. */}
        <div className="relative z-10 flex max-w-[60%] flex-col gap-1.5 sm:gap-3 md:gap-8 px-4 py-3 sm:px-6 sm:py-5 md:px-32 md:py-20">
          {current.title && (
            <h1 className="font-sans text-[14px] sm:text-[20px] md:text-[80px] font-bold leading-[1.1] tracking-normal text-[#9B660C]">
              {current.title}
            </h1>
          )}
          {current.discount_text && (
            <p className="text-[16px] sm:text-[20px] md:text-[32px] font-bold text-ink leading-[1.1]">{current.discount_text}</p>
          )}
          {current.description && (
            <p className="text-[10px] sm:text-[12px] md:text-[18px] text-[#525151] leading-snug md:leading-relaxed max-w-[520px] line-clamp-3 md:line-clamp-none">
              {current.description}
            </p>
          )}
          {current.buy_now_text && (
            <Link
              href={link}
              style={{
                clipPath:
                  "polygon(0 0, 0 0, 100% 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 100%)",
              }}
              className="group inline-flex h-[30px] sm:h-[36px] md:h-[48px] w-fit items-center justify-center gap-2 md:gap-3 bg-black px-3 sm:px-4 md:px-[40px] text-[10px] sm:text-[12px] md:text-[18px] font-bold uppercase tracking-[0.08em] md:tracking-[0.15em] text-white transition-all duration-300 ease-in hover:bg-[#1c1c1c]"
            >
              <span>{current.buy_now_text}</span>
              <span className="flex h-4 w-4 md:h-7 md:w-7 items-center justify-center rounded-full bg-white text-black transition-transform duration-200 group-hover:translate-x-0.5">
                <svg className="h-2.5 w-2.5 md:h-4 md:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="17" y2="12" />
                  <polyline points="13 7 18 12 13 17" />
                </svg>
              </span>
            </Link>
          )}
        </div>

        {/* Image — anchored to the right column, filling the banner's
            full height. Mobile uses a generous max-w (45%) so the model
            actually fills the slot instead of hiding in the corner. */}
        {productImg && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={productImg}
            alt={current.title || "Hero"}
            className="absolute right-0 bottom-0 h-full w-auto max-w-[45%] sm:max-w-[42%] md:max-w-[45%] lg:max-w-[50%] object-contain object-bottom object-right pointer-events-none"
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
