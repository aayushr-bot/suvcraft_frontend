import type { MetadataRoute } from "next";

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

// Allows everything except authenticated / cart / checkout / order flows
// (those have no value in a search index and just generate crawl noise).
// Points crawlers at the sitemap exposed at /sitemap.xml — Next.js renders
// app/sitemap.ts there automatically.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/cart",
          "/checkout",
          "/payment",
          "/payment-success",
          "/profile",
          "/orders",
          "/wishlist",
          "/addresses",
          "/saved-cards",
          "/search",
        ],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
