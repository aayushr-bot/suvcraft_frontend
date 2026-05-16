import type { MetadataRoute } from "next";
import { api } from "@/lib/api";

// Resolved at request time so newly-added products show up without a redeploy.
export const dynamic = "force-dynamic";

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

// Build a sitemap covering the main browse routes + every active product.
// Categories aren't dedicated routes today — the storefront filters via
// /products?category_id=… — so they're surfaced as separate entries below.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_ORIGIN}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_ORIGIN}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_ORIGIN}/feature-work`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_ORIGIN}/faq`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_ORIGIN}/policies/about-us`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_ORIGIN}/policies/privacy-policy`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_ORIGIN}/policies/shipping-policy`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_ORIGIN}/policies/return-policy`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  // Pull every active product. The public products endpoint already filters
  // by status=1 so drafts / inactive listings are excluded automatically.
  // Caps at 500 to keep the sitemap inside Google's 50 MB / 50k URL limits
  // for now — once the catalogue grows past that this should paginate into
  // a sitemap index.
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await api.products({ per_page: 500, status: "1" });
    productRoutes = (res.rows || []).map((p) => ({
      url: `${SITE_ORIGIN}/product/${p.id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch {
    // If the API is unreachable during build / first request we still want
    // a valid sitemap with at least the static routes — better than 500ing.
  }

  // Categories. The public list returns active rows only, so we don't have
  // to filter again here.
  let categoryRoutes: MetadataRoute.Sitemap = [];
  try {
    const cats = await api.categories();
    categoryRoutes = (cats.rows || []).map((c) => ({
      url: `${SITE_ORIGIN}/products?category_id=${c.id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
  } catch { /* same fallback rationale as above */ }

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
