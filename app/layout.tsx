import type { Metadata } from "next";
import { Instrument_Sans, Harmattan, Bruno_Ace_SC } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { api } from "@/lib/api";
import { CartProvider } from "@/lib/cartContext";
import { WishlistProvider } from "@/lib/wishlistContext";

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

export const metadata: Metadata = {
  title: "SUVCRAFT",
  description: "Access to high-quality, eco-friendly products and services",
  icons: {
    icon: "/figma/suvcraft-logo.png",
    shortcut: "/figma/suvcraft-logo.png",
    apple: "/figma/suvcraft-logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const categoriesData = await api.categories().catch(() => null);
  const navCategories = categoriesData?.rows ?? [];

  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${harmattan.variable} ${brunoAceSC.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <CartProvider>
          <WishlistProvider>
            <Navbar categories={navCategories} />
            <main className="flex-1">{children}</main>
            <Footer />
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
