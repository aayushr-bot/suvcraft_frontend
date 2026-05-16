import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { api, imgUrl } from "@/lib/api";
import ProductDetailClient from "./ProductDetailClient";

export const dynamic = "force-dynamic";

// Resolve an admin-stored image path (or external URL) to something a crawler
// will be able to fetch. Mirrors the helper inside the client component so the
// SEO/OG metadata uses the same final URL as the rendered <img>.
function resolveImg(path: string | undefined): string {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("/figma/")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}

// Strip HTML out of the admin-authored description so it can safely sit in
// <meta description>. Truncates to ~160 chars for SERP friendliness.
function plainText(html: string | undefined, max = 160): string {
  if (!html) return "";
  const stripped = String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return stripped.length > max ? `${stripped.slice(0, max - 1).trimEnd()}…` : stripped;
}

// `currentSiteOrigin` is used to build absolute URLs in the OG / canonical
// tags. NEXT_PUBLIC_SITE_URL should be the storefront's public host (e.g.
// "https://suvcraft.sarstage.online"). Falls back to the API base host
// in dev so prefetched crawlers still see a working canonical.
const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  (process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "");

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  let product = null;
  try { product = await api.product(id); } catch {}
  if (!product) return { title: "Product not found" };

  const name = product.name || "Product";
  const description = plainText(product.description) || product.short_description || "";
  const image = resolveImg(product.image);
  const url = `${SITE_ORIGIN}/product/${product.id}`;

  return {
    title: name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: name,
      description,
      url,
      type: "website",
      images: image ? [{ url: image, alt: name }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: name,
      description,
      images: image ? [image] : undefined,
    },
    other: {
      // OG product extension — useful for Facebook / Pinterest crawlers.
      ...(product.price ? { "product:price:amount": String(product.price) } : {}),
      "product:price:currency": "INR",
      "product:availability":
        product.stock != null && Number(product.stock) > 0 ? "in stock" : "out of stock",
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let product = null;
  let fetchError = false;
  try {
    product = await api.product(id);
  } catch {
    fetchError = true;
  }

  if (!product && !fetchError) notFound();

  if (fetchError || !product) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-4 py-20 md:px-8 min-h-screen flex flex-col items-center justify-center gap-6 bg-white">
        <div className="text-[60px]">😕</div>
        <h2 className="text-[24px] font-bold text-ink">Product not found</h2>
        <p className="text-[14px] text-[#8c8c8c]">This product may have been removed or the link is incorrect.</p>
        <Link href="/" className="inline-flex h-[48px] items-center justify-center rounded-[10px] bg-ink px-8 text-[15px] font-bold text-white hover:bg-black">
          Back to Shop
        </Link>
      </div>
    );
  }

  const catId = (product as any).cat_id ?? (product as any).category_id;
  const [related, ratingsData, popularData, settings] = await Promise.all([
    api.products({
      per_page: 16,
      ...(catId ? { category_id: catId } : {}),
    }).catch(() => ({ rows: [] as any[] })),
    api.productRatings(product!.id, 10).catch(() => ({ rows: [], summary: { total: 0, avg_rating: 0, r5: 0, r4: 0, r3: 0, r2: 0, r1: 0 } })),
    api.popularProducts({ limit: 16, exclude: product!.id }).catch(() => ({ rows: [] as any[] })),
    api.settings().catch(() => ({})),
  ]);

  const relatedFiltered = ((related as any).rows ?? []).filter((p: any) => p.id !== product!.id).slice(0, 12);
  const popular = ((popularData as any).rows ?? []).filter((p: any) => p.id !== product!.id).slice(0, 12);

  // Schema.org Product + Offer + AggregateRating. Google reads this to
  // render rich SERP cards (rating stars, price, in-stock). Skips optional
  // sub-blocks when the data isn't available so we never publish a broken
  // schema with placeholder values.
  const summary = (ratingsData as any).summary || {};
  const productImage = resolveImg((product as any).image);
  const productUrl = `${SITE_ORIGIN}/product/${product!.id}`;
  const inStock = (product as any).stock != null && Number((product as any).stock) > 0;
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product!.name,
    description: plainText((product as any).description, 5000) || (product as any).short_description || undefined,
    image: productImage || undefined,
    sku: (product as any).sku || undefined,
    brand: (product as any).brand_name ? { "@type": "Brand", name: (product as any).brand_name } : undefined,
    category: (product as any).category_name || undefined,
    url: productUrl,
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "INR",
      price: (product as any).price != null ? String((product as any).price) : "0",
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
  const totalRatings = Number(summary.total || 0);
  const avgRating = Number(summary.avg_rating || 0);
  if (totalRatings > 0 && avgRating > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: avgRating.toFixed(1),
      reviewCount: totalRatings,
      bestRating: "5",
      worstRating: "1",
    };
  }
  // Drop undefined-valued keys so the rendered JSON stays clean.
  for (const k of Object.keys(jsonLd)) {
    if (jsonLd[k] === undefined) delete jsonLd[k];
  }

  return (
    <>
      <script
        type="application/ld+json"
        // dangerouslySetInnerHTML is the standard way to embed JSON-LD —
        // React otherwise escapes the JSON, which crawlers can't parse.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient
        product={product}
        related={relatedFiltered}
        ratings={(ratingsData as any).rows ?? []}
        ratingSummary={(ratingsData as any).summary}
        popular={popular}
        settings={settings as any}
      />
    </>
  );
}
