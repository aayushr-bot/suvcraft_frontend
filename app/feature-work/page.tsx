import { api, imgUrl, type Product, type SiteSettings } from "@/lib/api";
import Link from "next/link";
import ProductImage from "../components/ProductImage";
import { ChevronRight, Star } from "../components/icons";

export const dynamic = "force-dynamic";

const PLACEHOLDER_IMG = "/product-placeholder.svg";

function fmt(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function getImg(p: { image?: string }) {
  if (!p.image) return PLACEHOLDER_IMG;
  if (p.image.startsWith("http")) return p.image;
  if (p.image.startsWith("/figma/")) return p.image;
  const clean = p.image.startsWith("/uploads/") ? p.image.slice("/uploads/".length) : p.image.replace(/^\//, "");
  return imgUrl(clean);
}

function ProductCard({ p }: { p: Product }) {
  const sp = Number(p.special_price ?? 0);
  const rg = Number(p.price ?? 0);
  const cur = sp && rg && sp < rg ? sp : rg;
  const off = sp && rg && sp < rg ? Math.round(((rg - sp) / rg) * 100) : 0;
  return (
    <Link
      href={`/product/${p.id}`}
      className="group flex w-[160px] sm:w-[180px] md:w-auto shrink-0 flex-col overflow-hidden rounded-[14px] border border-[#e7e7e7] bg-white transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="relative flex h-[140px] sm:h-[160px] items-center justify-center bg-[#f9f9f9] p-3">
        <ProductImage
          src={getImg(p)}
          alt={p.name}
          className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
        />
        {off > 0 && (
          <span className="absolute left-2 top-2 inline-flex items-center rounded-full bg-brand-purple px-2 py-0.5 text-[10px] font-bold text-white">
            {off}% OFF
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 px-3 py-2.5 border-t border-[#f0f0f0]">
        {p.category_name && (
          <span className="text-[10px] uppercase tracking-[0.1em] text-[#8c8c8c] truncate">{p.category_name}</span>
        )}
        <h3 className="text-[13px] font-semibold text-ink line-clamp-1 group-hover:underline">{p.name}</h3>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[14px] font-bold text-ink">{fmt(cur)}</span>
            {off > 0 && <span className="text-[10px] text-[#8c8c8c] line-through">{fmt(rg)}</span>}
          </div>
          <span className="inline-flex items-center gap-0.5 text-[10px] text-[#525151]">
            <Star className="h-2.5 w-2.5 text-[#f5a524]" />
            {Number(p.rating || 4.5).toFixed(1)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function SectionRow({
  title,
  subtitle,
  items,
  href = "/products",
}: {
  title: string;
  subtitle?: string;
  items: Product[];
  href?: string;
}) {
  if (!items.length) return null;
  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pt-8 md:px-8 md:pt-12">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="font-sans text-[20px] md:text-[26px] font-bold text-ink leading-tight">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[12.5px] text-[#8c8c8c]">{subtitle}</p>}
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink hover:text-brand-purple"
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {/* Mobile: horizontal scroll. Desktop: grid. */}
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0 md:overflow-visible" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-3 md:grid md:grid-cols-4 md:gap-5 lg:grid-cols-5">
          {items.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PromoCard({
  eyebrow,
  title,
  subtitle,
  cta,
  href,
  variant = "purple",
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  variant?: "purple" | "dark" | "amber";
}) {
  const bg = variant === "purple"
    ? "linear-gradient(135deg, #3E0149 0%, #6B0A7A 100%)"
    : variant === "amber"
      ? "linear-gradient(135deg, #9B660C 0%, #C58515 100%)"
      : "linear-gradient(135deg, #1c1c1c 0%, #3a3a3a 100%)";
  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pt-8 md:px-8 md:pt-12">
      <Link
        href={href}
        className="relative block overflow-hidden rounded-[18px] p-6 md:p-10 text-white hover:brightness-110 transition-all"
        style={{ background: bg }}
      >
        {/* Decorative oversize number */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-4 -bottom-6 select-none font-bold leading-none tracking-[-0.06em] text-white/[0.06]"
          style={{ fontSize: "clamp(140px, 22vw, 240px)" }}
        >
          %
        </span>
        <div className="relative flex flex-col gap-3 max-w-[480px]">
          <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
            {eyebrow}
          </span>
          <h3 className="font-sans text-[26px] md:text-[36px] font-bold leading-[1.05] tracking-tight">
            {title}
          </h3>
          <p className="text-[13px] md:text-[14px] text-white/75 leading-[1.6]">{subtitle}</p>
          <span className="mt-2 inline-flex h-[44px] w-fit items-center justify-center gap-2 rounded-full bg-white px-6 text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
            {cta}
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
    </section>
  );
}

// Read a settings key, fall back to a default when blank/undefined.
function cfg(settings: SiteSettings, key: keyof SiteSettings, fallback: string) {
  const v = String(settings[key] ?? "").trim();
  return v || fallback;
}

// Parse a comma-separated list of product IDs from a settings value.
function parseIds(raw: unknown): number[] {
  return String(raw ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

// Effective discount percentage on a product (0 when no special price).
function discountPct(p: Product): number {
  const rg = Number(p.price ?? 0);
  const sp = Number(p.special_price ?? 0);
  if (!rg || !sp || sp >= rg) return 0;
  return Math.round(((rg - sp) / rg) * 100);
}

// Parse the unified `source` setting into a pull-mode descriptor.
// Examples: "" → none, "popular" → popular, "discount:30" → discount@30, "rating:4" → rating@4
function parseSource(raw: unknown): { mode: "none" | "popular" | "discount" | "rating"; threshold: number } {
  const v = String(raw ?? "").trim();
  if (!v) return { mode: "none", threshold: 0 };
  if (v === "popular") return { mode: "popular", threshold: 0 };
  if (v.startsWith("discount:")) return { mode: "discount", threshold: Number(v.slice(9)) || 0 };
  if (v.startsWith("rating:")) return { mode: "rating", threshold: Number(v.slice(7)) || 0 };
  return { mode: "none", threshold: 0 };
}

// Resolve a product section. Priority order:
//   1. `source` setting — admin's chosen rule (popular / rating / discount).
//   2. Legacy `min_discount` setting (kept for backward compat).
//   3. Manual product IDs from the multi-select picker.
//   4. Fallback slice so the section is never empty.
async function resolveSection(
  idsRaw: unknown,
  sourceRaw: unknown,
  minDiscountLegacy: unknown,
  catalog: Product[],
  popular: Product[],
  fallback: Product[],
): Promise<Product[]> {
  const src = parseSource(sourceRaw);

  if (src.mode === "popular") {
    const list = popular.length ? popular : catalog;
    return list.slice(0, 10).length ? list.slice(0, 10) : fallback;
  }
  if (src.mode === "discount" && src.threshold > 0) {
    const filtered = catalog.filter((p) => discountPct(p) >= src.threshold).slice(0, 10);
    return filtered.length ? filtered : fallback;
  }
  if (src.mode === "rating" && src.threshold > 0) {
    const filtered = catalog
      .filter((p) => Number(p.rating || 0) >= src.threshold)
      .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))
      .slice(0, 10);
    return filtered.length ? filtered : fallback;
  }

  // Legacy fallback — older config saved a discount tier here before the
  // unified `source` field existed.
  const minDiscount = Number(minDiscountLegacy) || 0;
  if (minDiscount > 0) {
    const filtered = catalog.filter((p) => discountPct(p) >= minDiscount).slice(0, 10);
    return filtered.length ? filtered : fallback;
  }

  // Manual product picker
  const ids = parseIds(idsRaw);
  if (ids.length === 0) return fallback;
  const csv = ids.join(",");
  const res = await api.products({ ids: csv }).catch(() => ({ rows: [] as Product[] }));
  return res.rows?.length ? res.rows : fallback;
}

export default async function FeatureWorkPage() {
  // Pull a wider product pool than the homepage so we can carve out a few
  // distinct "looks" without showing the same SKU four times in a row.
  const [productsRes, popularRes, settings] = await Promise.all([
    // Pull a wide catalog so the discount-tier and rating filters have enough to choose from.
    api.products({ per_page: 100, status: "1" }).catch(() => ({ rows: [] as Product[] })),
    api.popularProducts({ limit: 30 }).catch(() => ({ rows: [] as Product[] })),
    api.settings().catch(() => ({} as SiteSettings)),
  ]);

  const all = productsRes.rows ?? [];
  const popular = popularRes.rows ?? [];

  // Resolve the four product sections — source rule > legacy discount > manual picker > auto-pick.
  const [section1, section2, section3, section4] = await Promise.all([
    resolveSection(settings.feature_section1_product_ids, settings.feature_section1_source, settings.feature_section1_min_discount, all, popular, popular.length ? popular.slice(0, 10) : all.slice(0, 10)),
    resolveSection(settings.feature_section2_product_ids, settings.feature_section2_source, settings.feature_section2_min_discount, all, popular, all.slice(0, 10)),
    resolveSection(settings.feature_section3_product_ids, settings.feature_section3_source, settings.feature_section3_min_discount, all, popular, all.slice(10, 20).length ? all.slice(10, 20) : all.slice(0, 10)),
    resolveSection(settings.feature_section4_product_ids, settings.feature_section4_source, settings.feature_section4_min_discount, all, popular, all.slice(5, 15).length ? all.slice(5, 15) : all.slice(0, 10)),
  ]);

  return (
    <div
      className="min-h-screen pb-16"
      style={{ background: "linear-gradient(179.62deg, #FFF6DE 0.33%, #FFFFFF 12.73%)" }}
    >
      {/* Page header */}
      <section className="mx-auto w-full max-w-[1440px] px-4 pt-6 pb-2 md:px-8 md:pt-10">
        <nav className="text-[12px] text-[#8c8c8c] mb-4">
          <Link href="/" className="hover:text-ink">Home</Link>
          <span className="mx-1.5">›</span>
          <span className="text-ink">Feature Work</span>
        </nav>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between md:gap-6">
          <div className="max-w-[620px]">
            <h1 className="font-sans text-[26px] md:text-[40px] font-bold text-ink leading-[1.05] tracking-tight">
              {cfg(settings, "feature_title", "Discover what's new in store")}
            </h1>
            <p className="mt-2 text-[13px] md:text-[14px] text-[#525151] leading-[1.6]">
              {cfg(settings, "feature_description", "Hand-picked drops, trending favourites and limited-time offers — refreshed every week.")}
            </p>
          </div>
          <Link
            href={cfg(settings, "feature_cta_link", "/products")}
            className="inline-flex h-[44px] w-fit items-center justify-center gap-2 rounded-full bg-ink px-6 text-[12px] font-bold uppercase tracking-[0.12em] text-white hover:bg-black"
          >
            {cfg(settings, "feature_cta_text", "Shop all")}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* Hero promo card */}
      <PromoCard
        eyebrow={cfg(settings, "feature_promo1_eyebrow", "Editor's pick")}
        title={cfg(settings, "feature_promo1_title", "Premium picks, picked just for you.")}
        subtitle={cfg(settings, "feature_promo1_subtitle", "Curated by our buyers. Free shipping on orders above ₹1,500 and a no-questions return window.")}
        cta={cfg(settings, "feature_promo1_cta_text", "Browse the edit")}
        href={cfg(settings, "feature_promo1_cta_link", "/products")}
        variant="purple"
      />

      {/* Section 1 */}
      <SectionRow
        title={cfg(settings, "feature_section1_title", "Store Favorites")}
        subtitle={cfg(settings, "feature_section1_subtitle", "Most-loved by our customers this month.")}
        items={section1}
      />

      {/* Promo card 2 */}
      <PromoCard
        eyebrow={cfg(settings, "feature_promo2_eyebrow", "Limited offer")}
        title={cfg(settings, "feature_promo2_title", "Up to 30% off bestsellers.")}
        subtitle={cfg(settings, "feature_promo2_subtitle", "Stack a coupon at checkout for an extra ₹100 off your first order over ₹999.")}
        cta={cfg(settings, "feature_promo2_cta_text", "Grab the deal")}
        href={cfg(settings, "feature_promo2_cta_link", "/products")}
        variant="amber"
      />

      {/* Section 2 */}
      <SectionRow
        title={cfg(settings, "feature_section2_title", "Trending This Week")}
        subtitle={cfg(settings, "feature_section2_subtitle", "What everyone's buying right now.")}
        items={section2}
      />

      {/* Section 3 */}
      <SectionRow
        title={cfg(settings, "feature_section3_title", "New Arrivals")}
        subtitle={cfg(settings, "feature_section3_subtitle", "Fresh drops, straight from the studio.")}
        items={section3}
      />

      {/* Promo card 3 */}
      <PromoCard
        eyebrow={cfg(settings, "feature_promo3_eyebrow", "Member perks")}
        title={cfg(settings, "feature_promo3_title", "Sign in. Save more.")}
        subtitle={cfg(settings, "feature_promo3_subtitle", "Your wallet balance, saved addresses, and exclusive member-only prices all in one place.")}
        cta={cfg(settings, "feature_promo3_cta_text", "Go to my account")}
        href={cfg(settings, "feature_promo3_cta_link", "/profile")}
        variant="dark"
      />

      {/* Section 4 */}
      <SectionRow
        title={cfg(settings, "feature_section4_title", "Best Sellers")}
        subtitle={cfg(settings, "feature_section4_subtitle", "Proven favorites, restocked weekly.")}
        items={section4}
      />
    </div>
  );
}
