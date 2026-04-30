"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "./icons";
import { type Collection, imgUrl } from "@/lib/api";

const PLACEHOLDER_IMG = "/figma/bag-collection.png";

function resolveImg(path: string | null | undefined) {
  if (!path) return PLACEHOLDER_IMG;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/figma/")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}

export default function BagCollection({ collections = [] }: { collections?: Collection[] }) {
  const [index, setIndex] = useState(0);

  if (!collections.length) return null;

  const c = collections[Math.min(index, collections.length - 1)];
  const headingLines = String(c.title || "").split(/\r?\n/).filter(Boolean);
  const description = c.description || "";
  const btnText = c.btn_text || "Shop Now";
  const btnLink = c.btn_link || "/#all-products";
  const image = resolveImg(c.image);

  const hasMany = collections.length > 1;
  const prev = () => setIndex((i) => (i - 1 + collections.length) % collections.length);
  const next = () => setIndex((i) => (i + 1) % collections.length);

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-4 md:px-8">
      <div className="relative flex items-center gap-2 md:gap-4">
        <button
          type="button"
          aria-label="Previous"
          onClick={prev}
          disabled={!hasMany}
          className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#e5e5e5] text-ink hover:bg-[#dcdcdc] disabled:opacity-40 disabled:cursor-not-allowed md:h-[56px] md:w-[56px]"
        >
          <ArrowRight className="h-4 w-4 rotate-180" strokeWidth={1.5} />
        </button>

        <div className="relative flex-1 overflow-hidden rounded-[16px] bg-[#efefef] px-5 py-4 md:rounded-[20px] md:px-10 md:py-2">
          <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_1fr] md:gap-6">
            <div>
              <h2 className="font-sans text-[20px] font-semibold leading-[1.15] text-ink md:text-[26px]">
                {headingLines.map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < headingLines.length - 1 && <br />}
                  </span>
                ))}
              </h2>
              {description && (
                <div
                  className="mt-3 max-w-[320px] text-[13px] leading-[1.55] text-ink prose prose-sm max-w-none [&_a]:text-brand-purple [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              )}
              <Link
                href={btnLink}
                className="mt-4 inline-flex h-[40px] items-center justify-center rounded-full border-[1.5px] border-ink px-7 text-[13px] font-medium text-ink hover:bg-black/5"
              >
                {btnText}
              </Link>

              {hasMany && (
                <div className="mt-4 flex gap-1.5">
                  {collections.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Slide ${i + 1}`}
                      onClick={() => setIndex(i)}
                      className={`h-[6px] rounded-full transition-all ${i === index ? "w-[24px] bg-ink" : "w-[6px] bg-ink/30 hover:bg-ink/50"}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="relative mx-auto h-[200px] w-full md:h-[290px] md:w-[440px]">
              <div className="absolute top-4 left-6 h-[150px] w-[150px] rounded-full bg-[#f8dccf] md:top-8 md:left-10 md:h-[220px] md:w-[220px]" />
              <div className="absolute right-2 bottom-0 h-[100px] w-[100px] rounded-full bg-[#d4e4f0] md:right-3 md:h-[150px] md:w-[150px]" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt=""
                className="absolute right-0 top-1/2 z-10 h-[220px] w-[220px] -translate-y-1/2 object-contain md:right-2 md:h-[320px] md:w-[340px]"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label="Next"
          onClick={next}
          disabled={!hasMany}
          className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#e5e5e5] text-ink hover:bg-[#dcdcdc] disabled:opacity-40 disabled:cursor-not-allowed md:h-[56px] md:w-[56px]"
        >
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </section>
  );
}
