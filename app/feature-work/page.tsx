"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "../components/icons";

type WorkItem = {
  id: number;
  number: string;
  title: string;
  category: "Bags" | "Accessories" | "Custom" | "Collaboration";
  client: string;
  year: string;
  blurb: string;
  // Per-item visual identity. The card uses these instead of a real photo so
  // the page reads as intentional editorial design rather than "missing image".
  bg: string;
  accent: string;
  tone: "dark" | "light";
};

const ITEMS: WorkItem[] = [
  {
    id: 1,
    number: "01",
    title: "Heritage Weekender",
    category: "Bags",
    client: "Studio Nomad",
    year: "2025",
    blurb: "Full-grain leather weekender built for a 14-city press tour. Hand-stitched, lined in waxed canvas.",
    bg: "linear-gradient(135deg, #3E0149 0%, #1a0220 100%)",
    accent: "#F5A524",
    tone: "dark",
  },
  {
    id: 2,
    number: "02",
    title: "Atelier Card Holder",
    category: "Accessories",
    client: "Maison Levi",
    year: "2025",
    blurb: "Slim 6-slot wallet released as part of Maison Levi's autumn capsule.",
    bg: "linear-gradient(160deg, #FFF6DE 0%, #f3e0b5 100%)",
    accent: "#3E0149",
    tone: "light",
  },
  {
    id: 3,
    number: "03",
    title: "Monogram Tote",
    category: "Custom",
    client: "Anika S.",
    year: "2024",
    blurb: "Made-to-order tote with embossed monogram and hidden zip pocket.",
    bg: "linear-gradient(145deg, #2d1b15 0%, #6b4423 100%)",
    accent: "#FFF6DE",
    tone: "dark",
  },
  {
    id: 4,
    number: "04",
    title: "Driver's Roll",
    category: "Collaboration",
    client: "Velocita Garage",
    year: "2025",
    blurb: "Tool roll for a vintage racing collective. Saddle-stitched, oiled cordovan.",
    bg: "linear-gradient(135deg, #9B660C 0%, #5c3d07 100%)",
    accent: "#FFF6DE",
    tone: "dark",
  },
  {
    id: 5,
    number: "05",
    title: "Editorial Briefcase",
    category: "Bags",
    client: "The Quarterly",
    year: "2024",
    blurb: "Photographed for The Quarterly's Spring '24 issue, page 47.",
    bg: "linear-gradient(160deg, #f0ebe3 0%, #d4c9b8 100%)",
    accent: "#1c1c1c",
    tone: "light",
  },
  {
    id: 6,
    number: "06",
    title: "Belt No. 03",
    category: "Accessories",
    client: "Suvcraft Editorial",
    year: "2024",
    blurb: "Solid brass buckle, single-bend bridle leather. Ages beautifully.",
    bg: "linear-gradient(135deg, #1c1c1c 0%, #3a3a3a 100%)",
    accent: "#F5A524",
    tone: "dark",
  },
];

const FILTERS: Array<WorkItem["category"] | "All"> = ["All", "Bags", "Accessories", "Custom", "Collaboration"];

const STATS = [
  { value: "150+", label: "Pieces Crafted" },
  { value: "12", label: "Brand Collabs" },
  { value: "08", label: "Press Features" },
  { value: "04", label: "Years In Studio" },
];

const PROCESS = [
  { n: "01", title: "Brief", body: "You send sketches, references, or just a feeling. We respond within 48 hours with questions and a rough quote." },
  { n: "02", title: "Design", body: "Two rounds of digital mockups. Material samples shipped to you for approval before we cut a single thread." },
  { n: "03", title: "Bench", body: "Built by one maker, start to finish. Most pieces take 3–5 weeks. You get progress photos at each major stage." },
  { n: "04", title: "Hand-off", body: "Final QA, branded packaging, signed authenticity card. Shipped insured. Lifetime repair on every commission." },
];

const PRESS = ["THE QUARTERLY", "MAISON JOURNAL", "STUDIO MAG", "CRAFTED", "LEATHERWORK CO."];

export default function FeatureWorkPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const items = useMemo(
    () => (filter === "All" ? ITEMS : ITEMS.filter((i) => i.category === filter)),
    [filter],
  );

  const [feature, ...rest] = items;

  return (
    <div className="bg-white">
      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(179.62deg, #FFF6DE 0.33%, #FFFFFF 60%)" }}
      >
        <div className="mx-auto w-full max-w-[1440px] px-4 pt-6 pb-16 md:px-8 md:pt-10 md:pb-24">
          {/* Breadcrumb */}
          <nav className="text-[12px] tracking-wide text-[#8c8c8c] mb-8 md:mb-12">
            <Link href="/" className="hover:text-ink">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-ink">Feature Work</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-end">
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8c8c8c]">
                <span className="h-px w-8 bg-[#8c8c8c]" />
                Studio · Vol. 04 · 2026
              </span>
              <h1 className="mt-6 font-sans text-[44px] sm:text-[64px] md:text-[88px] xl:text-[104px] font-bold leading-[0.95] tracking-[-0.02em] text-ink">
                Feature
                <br />
                <span className="italic font-normal text-brand-purple">Work</span>
                <span className="text-[#8c8c8c]">.</span>
              </h1>
              <p className="mt-7 max-w-[520px] text-[14px] md:text-[16px] text-[#525151] leading-[1.75]">
                A rolling archive of commissions, brand collaborations, and editorial pieces
                that&apos;ve left our bench. Every entry is one-of-a-kind &mdash; hand-cut,
                hand-stitched, signed off in our studio.
              </p>
            </div>

            <div className="flex flex-col items-start gap-5 lg:items-end">
              <div className="grid grid-cols-2 gap-x-10 gap-y-1">
                {STATS.slice(0, 2).map((s) => (
                  <div key={s.label} className="flex flex-col">
                    <span className="text-[28px] md:text-[36px] font-bold text-ink leading-none">{s.value}</span>
                    <span className="mt-1.5 text-[11px] uppercase tracking-[0.16em] text-[#8c8c8c]">{s.label}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/products"
                className="inline-flex h-[52px] items-center gap-3 rounded-full bg-ink px-7 text-[13px] font-bold uppercase tracking-[0.14em] text-white hover:bg-black"
              >
                Shop the line
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FILTER BAR ───────────────────────────────────────── */}
      <section className="sticky top-0 z-20 border-y border-[#eee] bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-3.5 md:px-8 md:py-4">
          <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0" style={{ scrollbarWidth: "none" }}>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="hidden md:inline-flex h-[34px] items-center pr-3 text-[11px] uppercase tracking-[0.16em] text-[#8c8c8c]">
                Filter
              </span>
              {FILTERS.map((f) => {
                const active = filter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={
                      active
                        ? "inline-flex h-[34px] items-center justify-center rounded-full bg-ink px-5 text-[12px] font-semibold text-white"
                        : "inline-flex h-[34px] items-center justify-center rounded-full px-5 text-[12px] font-medium text-[#525151] hover:bg-[#f3f3f3] transition-colors"
                    }
                  >
                    {f}
                  </button>
                );
              })}
              <span className="ml-auto hidden md:inline-flex h-[34px] items-center text-[11px] uppercase tracking-[0.16em] text-[#8c8c8c]">
                {items.length} {items.length === 1 ? "piece" : "pieces"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── EMPTY STATE ──────────────────────────────────────── */}
      {items.length === 0 && (
        <div className="mx-auto w-full max-w-[1440px] px-4 py-24 md:px-8 text-center">
          <div className="text-[60px] mb-4">🪡</div>
          <p className="text-[16px] font-semibold text-ink">Nothing in this category yet.</p>
          <button
            type="button"
            onClick={() => setFilter("All")}
            className="mt-3 text-[13px] font-semibold text-brand-purple hover:underline"
          >
            Show all work
          </button>
        </div>
      )}

      {/* ─── FEATURED PROJECT ─────────────────────────────────── */}
      {feature && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-12 md:px-8 md:pt-16">
          <div className="flex items-center justify-between mb-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8c8c8c]">
              Lead Story
            </span>
            <span className="text-[11px] uppercase tracking-[0.16em] text-[#8c8c8c]">
              No. {feature.number}
            </span>
          </div>

          <article
            className="group relative overflow-hidden rounded-[24px] cursor-pointer"
            style={{ background: feature.bg }}
          >
            <div
              className={`grid grid-cols-1 lg:grid-cols-2 min-h-[420px] md:min-h-[520px] ${feature.tone === "dark" ? "text-white" : "text-ink"}`}
            >
              {/* Left: copy */}
              <div className="flex flex-col justify-between p-7 md:p-12 lg:p-16">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${feature.tone === "dark" ? "bg-white/15 text-white" : "bg-ink/10 text-ink"}`}
                  >
                    {feature.category}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.16em] opacity-60">
                    For {feature.client} · {feature.year}
                  </span>
                </div>

                <div>
                  <h2 className="font-sans text-[36px] sm:text-[48px] md:text-[64px] font-bold leading-[0.95] tracking-[-0.02em]">
                    {feature.title}
                  </h2>
                  <p className="mt-5 max-w-[440px] text-[14px] md:text-[15px] leading-[1.75] opacity-80">
                    {feature.blurb}
                  </p>
                  <button
                    type="button"
                    className={`mt-7 inline-flex h-[44px] items-center gap-2 rounded-full px-6 text-[12px] font-bold uppercase tracking-[0.14em] transition-all group-hover:translate-x-1 ${feature.tone === "dark" ? "bg-white text-ink hover:bg-[#f0f0f0]" : "bg-ink text-white hover:bg-black"}`}
                  >
                    Read case study
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Right: huge number-as-visual */}
              <div className="relative flex items-center justify-center overflow-hidden p-7 md:p-12 lg:p-16">
                <span
                  className="select-none font-sans font-bold leading-none tracking-[-0.06em] opacity-90"
                  style={{
                    fontSize: "clamp(180px, 30vw, 360px)",
                    color: feature.accent,
                  }}
                >
                  {feature.number}
                </span>
                <span
                  className={`absolute right-7 md:right-12 lg:right-16 bottom-7 md:bottom-12 lg:bottom-16 text-[11px] uppercase tracking-[0.16em] ${feature.tone === "dark" ? "text-white/60" : "text-ink/50"}`}
                >
                  Edition of 1
                </span>
              </div>
            </div>
          </article>
        </section>
      )}

      {/* ─── EDITORIAL GRID ───────────────────────────────────── */}
      {rest.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-10 pb-20 md:px-8 md:pt-16 md:pb-28">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 md:gap-7">
            {rest.map((it, i) => (
              <article
                key={it.id}
                // Every fourth tile spans two columns on desktop for an asymmetric feel.
                className={`group relative overflow-hidden rounded-[20px] cursor-pointer ${i % 5 === 0 ? "lg:col-span-2 lg:row-span-1" : ""}`}
                style={{ background: it.bg }}
              >
                <div
                  className={`flex flex-col justify-between min-h-[340px] md:min-h-[400px] p-6 md:p-8 ${it.tone === "dark" ? "text-white" : "text-ink"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${it.tone === "dark" ? "bg-white/15 text-white" : "bg-ink/10 text-ink"}`}
                    >
                      {it.category}
                    </span>
                    <span
                      className="select-none font-sans font-bold leading-none tracking-[-0.04em] opacity-80"
                      style={{ fontSize: "clamp(56px, 7vw, 96px)", color: it.accent }}
                    >
                      {it.number}
                    </span>
                  </div>

                  <div>
                    <div className={`text-[10px] uppercase tracking-[0.18em] mb-2 ${it.tone === "dark" ? "text-white/60" : "text-ink/50"}`}>
                      For {it.client} · {it.year}
                    </div>
                    <h3 className="font-sans text-[22px] md:text-[26px] font-bold leading-tight">
                      {it.title}
                    </h3>
                    <p className={`mt-2 text-[13px] leading-[1.65] line-clamp-2 ${it.tone === "dark" ? "text-white/75" : "text-ink/70"}`}>
                      {it.blurb}
                    </p>

                    <div className="mt-5 flex items-center justify-between">
                      <span className={`text-[11px] uppercase tracking-[0.18em] ${it.tone === "dark" ? "text-white/60" : "text-ink/50"}`}>
                        Case study
                      </span>
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full transition-all group-hover:translate-x-1 ${it.tone === "dark" ? "bg-white text-ink" : "bg-ink text-white"}`}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ─── PROCESS ──────────────────────────────────────────── */}
      <section className="bg-[#FAFAF8] border-y border-[#eee]">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-16 md:px-8 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 lg:gap-16">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8c8c8c]">
                How it&apos;s made
              </span>
              <h2 className="mt-4 font-sans text-[34px] md:text-[44px] font-bold leading-[1.05] text-ink">
                Four weeks,
                <br />
                from <span className="italic font-normal text-brand-purple">sketch</span>
                <br />
                to shelf.
              </h2>
              <p className="mt-5 max-w-[360px] text-[14px] text-[#525151] leading-[1.75]">
                One maker per piece. No subcontractors, no production lines &mdash;
                just bench time, hand tools, and a lot of patience.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10">
              {PROCESS.map((p) => (
                <div key={p.n} className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-3">
                    <span className="text-[34px] font-bold text-brand-purple leading-none">{p.n}</span>
                    <span className="h-px flex-1 bg-[#cfcfcf]" />
                  </div>
                  <h3 className="mt-2 text-[18px] font-bold text-ink">{p.title}</h3>
                  <p className="text-[13px] text-[#525151] leading-[1.7]">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRESS STRIP ──────────────────────────────────────── */}
      <section className="border-b border-[#eee]">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-8 md:py-14">
          <div className="flex flex-col items-center gap-6">
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8c8c8c]">
              As featured in
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 md:gap-x-16">
              {PRESS.map((p) => (
                <span
                  key={p}
                  className="text-[13px] md:text-[15px] font-bold tracking-[0.18em] text-[#9c9c9c] hover:text-ink transition-colors"
                  style={{ fontFamily: "var(--font-bruno), sans-serif" }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1440px] px-4 py-16 md:px-8 md:py-24">
        <div
          className="relative overflow-hidden rounded-[28px] p-8 md:p-14 lg:p-20"
          style={{ background: "linear-gradient(135deg, #1c1c1c 0%, #2d1b32 60%, #3E0149 100%)" }}
        >
          {/* Decorative big number */}
          <span
            className="pointer-events-none absolute -right-6 -bottom-10 select-none font-sans font-bold leading-none tracking-[-0.06em] text-white/[0.04]"
            style={{ fontSize: "clamp(220px, 32vw, 420px)" }}
          >
            07
          </span>

          <div className="relative flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-[600px]">
              <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-purple animate-pulse" />
                Commissions Open · 3 slots left for Q3
              </span>
              <h2 className="mt-5 font-sans text-[32px] sm:text-[40px] md:text-[52px] font-bold leading-[1.02] tracking-[-0.02em] text-white">
                Have a piece in mind?
                <br />
                <span className="italic font-normal text-white/70">Let&apos;s build it.</span>
              </h2>
              <p className="mt-5 text-[14px] md:text-[15px] text-white/65 leading-[1.75] max-w-[480px]">
                Tell us what you&apos;re after &mdash; sketches, reference photos, a vague feeling.
                We&apos;ll send a quote within 48 hours.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/"
                className="inline-flex h-[56px] items-center justify-center gap-2 rounded-full bg-white px-8 text-[13px] font-bold uppercase tracking-[0.14em] text-ink hover:bg-[#f0f0f0]"
              >
                Start a brief
                <ChevronRight className="h-4 w-4" />
              </Link>
              <span className="text-[11px] uppercase tracking-[0.18em] text-white/40 text-center">
                Avg. reply · under 48h
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
