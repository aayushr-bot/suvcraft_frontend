import type { Metadata } from "next";
import { Instrument_Sans, Harmattan, Bruno_Ace_SC } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import FeatureStrip from "./components/FeatureStrip";
import { api, imgUrl, type SiteSettings } from "@/lib/api";
import { CartProvider } from "@/lib/cartContext";
import { WishlistProvider } from "@/lib/wishlistContext";
import CsrfBootstrap from "./components/CsrfBootstrap";

function resolveAsset(path?: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const harmattan = Harmattan({
  variable: "--font-harmattan",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const brunoAceSC = Bruno_Ace_SC({
  variable: "--font-bruno-ace-sc",
  subsets: ["latin"],
  weight: ["400"],
});

// Build metadata from admin-managed settings on every request (Next.js 16 will cache
// the result via the page's revalidation strategy).
export async function generateMetadata(): Promise<Metadata> {
  let s: SiteSettings = {};
  try { s = (await api.settings()) as SiteSettings; } catch {}
  // Only set icon when admin has uploaded one — let the browser use its default otherwise.
  const favicon = resolveAsset(s.favicon);
  const meta: Metadata = {
    title: s.site_title || "SUVCRAFT",
    description: s.meta_description || s.app_short_description || "",
    keywords: s.meta_keywords || undefined,
  };
  if (favicon) meta.icons = { icon: favicon, shortcut: favicon, apple: favicon };
  return meta;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [categoriesData, navSettings] = await Promise.all([
    api.categories().catch(() => null),
    api.settings().catch(() => null),
  ]);
  const navCategories = categoriesData?.rows ?? [];
  const headerLogo = (navSettings as SiteSettings | null)?.logo || "";
  const siteTitle = (navSettings as SiteSettings | null)?.site_title || "SUVCRAFT";

  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${harmattan.variable} ${brunoAceSC.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <CsrfBootstrap />
        <CartProvider>
          <WishlistProvider>
            <Navbar categories={navCategories} logo={headerLogo} siteTitle={siteTitle} />
            <main className="flex-1">{children}</main>
            <FeatureStrip settings={(navSettings as SiteSettings | null) ?? {}} />
            <Footer />
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
