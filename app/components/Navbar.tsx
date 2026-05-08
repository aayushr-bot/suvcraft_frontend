"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  CartIcon,
  SearchIcon,
  UserIcon,
  OrderIcon,
  BanIcon,
  HeadsetIcon,
  LogOutIcon,
  ChevronRight,
  HeartLine,
  SettingsIcon,
  MapPinIcon,
  CreditCardIcon,
  BellIcon,
  Trash2,
} from "./icons";
import AuthModal from "./AuthModal";
import ContactModal from "./ContactModal";
import WishlistDrawer from "./WishlistDrawer";
import { api, type Category, type CategoryTab, imgUrl } from "@/lib/api";

// Resolve an admin-uploaded logo. Returns "" when admin hasn't uploaded one
// (caller should hide the <img> rather than render a broken placeholder).
function resolveLogo(path?: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}
import { useCart } from "@/lib/cartContext";
import { useWishlist } from "@/lib/wishlistContext";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const SHOP_LINK = { id: 0, label: "Shop", href: "/", slug: "shop" };

type User = { name: string; email: string; mobile?: string; image?: string; has_password?: boolean };

function pickDisplayName(user: User): { label: string; isMobile: boolean } {
  const raw = (user.name || "").trim();
  // If "name" is just digits (came from a mobile-OTP signup with no name set), mask it.
  if (raw && /^\+?\d{6,}$/.test(raw)) {
    const last4 = raw.slice(-4);
    return { label: `••${last4}`, isMobile: true };
  }
  if (raw) return { label: raw.split(" ")[0], isMobile: false };
  if (user.email) return { label: user.email.split("@")[0], isMobile: false };
  if (user.mobile) return { label: `••${String(user.mobile).slice(-4)}`, isMobile: true };
  return { label: "Account", isMobile: false };
}

type NavbarProps = { categories?: Category[]; logo?: string; siteTitle?: string };

export default function Navbar(props: NavbarProps) {
  return (
    <Suspense fallback={<NavbarInner {...props} activeCategoryId={-1} />}>
      <NavbarWithSearchParams {...props} />
    </Suspense>
  );
}

function NavbarWithSearchParams(props: NavbarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isHome = pathname === "/";
  const cid = isHome ? Number(searchParams.get("category_id") || 0) : -1;
  return <NavbarInner {...props} activeCategoryId={cid} />;
}

function NavbarInner({ categories = [], activeCategoryId, logo, siteTitle }: NavbarProps & { activeCategoryId: number }) {
  const headerLogo = resolveLogo(logo);
  const brand = siteTitle || "SUVCRAFT";
  const navLinks = [
    SHOP_LINK,
    ...categories.map((c) => ({ id: c.id, label: c.name, href: `/?category_id=${c.id}`, slug: c.slug })),
  ];
  const pathname = usePathname();
  const router = useRouter();
  const isOrdersRoute = pathname === "/orders" || pathname.startsWith("/orders/");
  const isSimplifiedHeader = pathname === "/cart" || pathname === "/checkout" || pathname === "/payment" || pathname === "/payment-success";
  // Only the singular detail route (/product/[id]) gets the white-nav treatment.
  // The trailing slash matters — without it this also matched /products (the
  // catalog page), giving the listing a mismatched white nav over a cream body.
  const isProductPage = pathname.startsWith("/product/");
  // Catalog page uses a cream gradient body — give the nav the same starting
  // tint so the gradient appears to begin at the top of the page.
  const isProductsCatalog = pathname === "/products";
  // Pages that override the body background to white. Search bar uses a soft
  // grey here so it stays visible against the white surroundings.
  const isWhiteBody = isProductPage
    || pathname === "/profile"
    || pathname === "/addresses"
    || pathname === "/saved-cards";

  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [hoveredCatId, setHoveredCatId] = useState<number | null>(null);
  const [tabsByCat, setTabsByCat] = useState<Record<number, CategoryTab[]>>({});
  const catCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openCategory(id: number) {
    if (catCloseTimerRef.current) {
      clearTimeout(catCloseTimerRef.current);
      catCloseTimerRef.current = null;
    }
    if (id <= 0) { setHoveredCatId(null); return; }
    setHoveredCatId(id);
    // Lazy-fetch tabs the first time a category is hovered, then cache.
    if (tabsByCat[id] === undefined) {
      api.categoryTabs({ category_id: id })
        .then((r) => setTabsByCat((prev) => ({ ...prev, [id]: r.rows ?? [] })))
        .catch(() => setTabsByCat((prev) => ({ ...prev, [id]: [] })));
    }
  }

  function scheduleCloseCategory() {
    if (catCloseTimerRef.current) clearTimeout(catCloseTimerRef.current);
    catCloseTimerRef.current = setTimeout(() => setHoveredCatId(null), 1000);
  }

  // Settings dropdown — mirror the same delayed-close behavior.
  const settingsCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function openSettings() {
    if (settingsCloseTimerRef.current) {
      clearTimeout(settingsCloseTimerRef.current);
      settingsCloseTimerRef.current = null;
    }
    setIsSettingsOpen(true);
  }
  function scheduleCloseSettings() {
    if (settingsCloseTimerRef.current) clearTimeout(settingsCloseTimerRef.current);
    settingsCloseTimerRef.current = setTimeout(() => setIsSettingsOpen(false), 1000);
  }

  // Close the settings dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!isSettingsOpen) return;
    function onClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isSettingsOpen]);

  function handleSearch() {
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  useEffect(() => {
    fetch(`${API}/api/v1/auth/me`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        const u = j?.data?.user;
        if (u) setUser({ name: u.name || u.username || "", email: u.email || "", mobile: u.mobile || "", image: u.image || "", has_password: !!u.has_password });
      })
      .catch(() => {});
  }, []);

  function handleLogout() {
    fetch(`${API}/api/v1/auth/logout`, { method: "POST", credentials: "include" })
      .finally(() => { setUser(null); });
  }

  function openAccount() {
    if (user) router.push("/profile");
    else setIsSignInOpen(true);
  }

  // Dropdown menu items are protected — block navigation and open the sign-in
  // modal when the user isn't authenticated yet.
  function handleProtectedClick(e: React.MouseEvent) {
    setIsSettingsOpen(false);
    if (!user) {
      e.preventDefault();
      setIsSignInOpen(true);
    }
  }

  if (isOrdersRoute) return null;

  if (isSimplifiedHeader) {
    return (
      <header className="w-full bg-white">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              {headerLogo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={headerLogo} alt={brand} className="h-[42px] w-auto md:h-[52px]" />
              ) : (
                <span className="font-bruno text-[18px] font-bold leading-none text-brand-purple md:text-[24px]" style={{ letterSpacing: "0.08em" }}>
                  {brand}
                </span>
              )}
            </Link>
            <button
              onClick={() => setIsContactOpen(true)}
              className="inline-flex h-[50px] w-[160px] items-center justify-center rounded-[41px] border border-[#d4d4d4] text-[15px] font-medium text-ink-soft hover:bg-black/5"
            >
              Contact
            </button>
          </div>
        </div>
        <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
        <WishlistDrawer open={isWishlistOpen} onClose={() => setIsWishlistOpen(false)} />
      </header>
    );
  }

  return (
    <header
      className={`w-full ${isProductPage ? "bg-white" : ""}`}
      style={isProductsCatalog ? { background: "#FFF6DE" } : undefined}
    >
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-3 md:px-8 md:pt-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {headerLogo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={headerLogo} alt={brand} className="h-[42px] w-auto md:h-[52px]" />
            ) : (
              <span className="font-bruno text-[18px] font-bold leading-none text-brand-purple md:text-[24px]" style={{ letterSpacing: "0.08em" }}>
                {brand}
              </span>
            )}
          </Link>

          <div className="flex items-center gap-2 md:gap-3">
            {user ? (
              (() => {
                const dn = pickDisplayName(user);
                return (
                  <div
                    className="inline-flex h-[38px] items-center gap-2 rounded-[41px] border border-[#d4d4d4] bg-white pl-1.5 pr-3 text-[13px] font-medium text-ink-soft md:h-[50px] md:pl-1.5 md:pr-4 md:text-[14px]"
                  >
                    <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-brand-purple text-white md:h-[40px] md:w-[40px]">
                      <UserIcon className="h-4 w-4 md:h-5 md:w-5" strokeWidth={1.6} />
                    </span>
                    <span className="max-w-[100px] truncate md:max-w-[120px]">
                      {dn.isMobile ? dn.label : `Hi, ${dn.label}`}
                    </span>
                  </div>
                );
              })()
            ) : (
              <button
                onClick={() => setIsSignInOpen(true)}
                className="inline-flex h-[38px] w-[110px] items-center justify-center rounded-[41px] bg-ink-soft text-[13px] font-medium text-white hover:bg-black md:h-[50px] md:w-[160px] md:text-[15px]"
              >
                Sign Up / In
              </button>
            )}
            <button
              onClick={() => setIsContactOpen(true)}
              className="hidden items-center justify-center rounded-[41px] border border-ink-soft text-[15px] font-medium text-ink-soft hover:bg-black/5 md:inline-flex md:h-[50px] md:w-[160px]"
            >
              Contact
            </button>
          </div>
        </div>

        {/* Popups */}
        <AuthModal isOpen={isSignInOpen} onClose={() => setIsSignInOpen(false)} onSuccess={(u) => { setUser(u); setIsSignInOpen(false); }} />
        <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
        <WishlistDrawer open={isWishlistOpen} onClose={() => setIsWishlistOpen(false)} />

        {/* Desktop + tablet category rail */}
        <div className="relative mt-4 hidden h-[64px] items-center gap-4 rounded-[15px] border-y border-[#d4d4d4] px-6 md:flex">
          <nav className="flex flex-1 min-w-0 items-center justify-between gap-5 whitespace-nowrap text-[14px] lg:gap-7 lg:text-[15px]">
            {navLinks.map((c) => {
              const isActive = c.id === activeCategoryId;
              const tabs = tabsByCat[c.id];
              const isOpen = hoveredCatId === c.id && c.id > 0 && tabs && tabs.length > 0;
              return (
                <div
                  key={c.slug}
                  className="relative flex h-full items-center"
                  onMouseEnter={() => openCategory(c.id)}
                  onMouseLeave={scheduleCloseCategory}
                >
                  <Link
                    href={c.href}
                    className={`shrink-0 ${isActive
                      ? "font-semibold text-ink"
                      : "font-normal text-[#6b6b6b] hover:text-ink"
                    }`}
                  >
                    {c.label}
                  </Link>
                  {isOpen && (
                    <div className="absolute left-0 top-full mt-1 z-50 min-w-[200px] rounded-[10px] border border-[#e7e7e7] bg-white py-1 shadow-lg">
                      <Link
                        href={`/?category_id=${c.id}`}
                        onClick={() => setHoveredCatId(null)}
                        className="block px-4 py-2 text-[13px] font-semibold text-ink hover:bg-[#f6f6f6]"
                      >
                        All
                      </Link>
                      {tabs.map((t) => (
                        <Link
                          key={t.id}
                          href={`/?category_id=${c.id}&type=${t.slug}`}
                          onClick={() => setHoveredCatId(null)}
                          className="block px-4 py-2 text-[13px] text-[#525151] hover:bg-[#f6f6f6] hover:text-ink"
                        >
                          {t.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <label className={`ml-4 flex h-[40px] w-[280px] shrink-0 items-center gap-2 rounded-[45px] px-4 shadow-sm lg:ml-8 lg:w-[380px] lg:h-[44px] lg:px-5 ${isWhiteBody ? "bg-[#F7F7F7]" : "bg-white"}`}>
            <input
              type="search"
              placeholder="Search Product"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-[#8c8c8c] focus:outline-none md:text-[14px]"
            />
            <button type="button" onClick={handleSearch} aria-label="Search">
              <SearchIcon className="h-4 w-4 text-ink-soft" />
            </button>
          </label>

          <div
            ref={settingsRef}
            className="relative"
            onMouseEnter={openSettings}
            onMouseLeave={scheduleCloseSettings}
          >
            <button
              type="button"
              aria-label="Settings"
              aria-expanded={isSettingsOpen}
              onClick={() => setIsSettingsOpen((v) => !v)}
              className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full text-ink-soft hover:bg-black/5 md:h-[44px] md:w-[44px]"
            >
              <SettingsIcon className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-purple px-1 text-[10px] font-bold text-white">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </button>
            {isSettingsOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-[220px] rounded-[10px] border border-[#e7e7e7] bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={(e) => {
                    setIsSettingsOpen(false);
                    if (!user) { e.preventDefault(); setIsSignInOpen(true); return; }
                    setIsWishlistOpen(true);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]"
                >
                  <HeartLine className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1 text-left">Wishlist</span>
                  {wishlistCount > 0 && (
                    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-purple px-1 text-[10px] font-bold text-white">
                      {wishlistCount > 99 ? "99+" : wishlistCount}
                    </span>
                  )}
                </button>
                <Link
                  href="/orders"
                  onClick={handleProtectedClick}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]"
                >
                  <OrderIcon className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1">My Orders</span>
                </Link>
                <Link
                  href="/profile"
                  onClick={handleProtectedClick}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]"
                >
                  <UserIcon className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1">Edit Profile</span>
                </Link>
                <Link
                  href="/addresses"
                  onClick={handleProtectedClick}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]"
                >
                  <MapPinIcon className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1">Saved Address</span>
                </Link>
                <Link
                  href="/saved-cards"
                  onClick={handleProtectedClick}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]"
                >
                  <CreditCardIcon className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1">Saved Cards</span>
                </Link>
                <Link
                  href="/notifications"
                  onClick={handleProtectedClick}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]"
                >
                  <BellIcon className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1">Notifications</span>
                </Link>

                <div className="my-1 border-t border-[#eee]" />

                <button
                  type="button"
                  onClick={() => { setIsSettingsOpen(false); setIsContactOpen(true); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]"
                >
                  <HeadsetIcon className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1 text-left">Help</span>
                </button>
                {user && (
                  <button
                    type="button"
                    onClick={() => { setIsSettingsOpen(false); handleLogout(); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]"
                  >
                    <LogOutIcon className="h-4 w-4 text-ink-soft" />
                    <span className="flex-1 text-left">Sign Out</span>
                  </button>
                )}
                <Link
                  href="/delete-account"
                  onClick={handleProtectedClick}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="flex-1">Delete Account</span>
                </Link>
              </div>
            )}
          </div>
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full text-ink-soft hover:bg-black/5 md:h-[44px] md:w-[44px]"
          >
            <CartIcon className="h-5 w-5" strokeWidth={1.5} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-purple px-1 text-[10px] font-bold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
        </div>

        {/* Mobile search bar */}
        <div className="mt-3 flex md:hidden">
          <label className={`flex h-[40px] flex-1 items-center gap-2 rounded-[45px] px-4 shadow-sm ${isWhiteBody ? "bg-[#F7F7F7]" : "bg-white"}`}>
            <input
              type="search"
              placeholder="Search Product"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-[#8c8c8c] focus:outline-none"
            />
            <button type="button" onClick={handleSearch} aria-label="Search">
              <SearchIcon className="h-4 w-4 text-ink-soft" />
            </button>
          </label>
          <div className="relative ml-2">
            <button
              type="button"
              aria-label="Settings"
              aria-expanded={isSettingsOpen}
              onClick={() => setIsSettingsOpen((v) => !v)}
              className="relative flex h-[40px] w-[40px] items-center justify-center rounded-full text-ink-soft hover:bg-black/5"
            >
              <SettingsIcon className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-purple px-1 text-[10px] font-bold text-white">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </button>
            {isSettingsOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-[220px] rounded-[10px] border border-[#e7e7e7] bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={(e) => {
                    setIsSettingsOpen(false);
                    if (!user) { e.preventDefault(); setIsSignInOpen(true); return; }
                    setIsWishlistOpen(true);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]"
                >
                  <HeartLine className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1 text-left">Wishlist</span>
                  {wishlistCount > 0 && (
                    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-purple px-1 text-[10px] font-bold text-white">
                      {wishlistCount > 99 ? "99+" : wishlistCount}
                    </span>
                  )}
                </button>
                <Link href="/orders" onClick={handleProtectedClick} className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]">
                  <OrderIcon className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1">My Orders</span>
                </Link>
                <Link href="/profile" onClick={handleProtectedClick} className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]">
                  <UserIcon className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1">Edit Profile</span>
                </Link>
                <Link href="/addresses" onClick={handleProtectedClick} className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]">
                  <MapPinIcon className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1">Saved Address</span>
                </Link>
                <Link href="/saved-cards" onClick={handleProtectedClick} className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]">
                  <CreditCardIcon className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1">Saved Cards</span>
                </Link>
                <Link href="/notifications" onClick={handleProtectedClick} className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]">
                  <BellIcon className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1">Notifications</span>
                </Link>
                <div className="my-1 border-t border-[#eee]" />
                <button
                  type="button"
                  onClick={() => { setIsSettingsOpen(false); setIsContactOpen(true); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]"
                >
                  <HeadsetIcon className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1 text-left">Help</span>
                </button>
                {user && (
                  <button
                    type="button"
                    onClick={() => { setIsSettingsOpen(false); handleLogout(); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]"
                  >
                    <LogOutIcon className="h-4 w-4 text-ink-soft" />
                    <span className="flex-1 text-left">Sign Out</span>
                  </button>
                )}
                <Link href="/delete-account" onClick={handleProtectedClick} className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                  <span className="flex-1">Delete Account</span>
                </Link>
              </div>
            )}
          </div>
          <Link href="/cart" aria-label="Cart" className="relative ml-2 flex h-[40px] w-[40px] items-center justify-center rounded-full text-ink-soft hover:bg-black/5">
            <CartIcon className="h-5 w-5" strokeWidth={1.5} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-purple px-1 text-[10px] font-bold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
        </div>

        {/* Mobile category scroll */}
        <div className="mt-3 flex gap-4 overflow-x-auto pb-1 text-[13px] md:hidden" style={{ scrollbarWidth: "none" }}>
          {navLinks.map((c) => {
            const isActive = c.id === activeCategoryId;
            return (
              <Link
                key={c.slug}
                href={c.href}
                className={`shrink-0 ${isActive ? "font-semibold text-ink" : "font-normal text-[#6b6b6b]"}`}
              >
                {c.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}

function resolveAvatar(image?: string): string | null {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  if (image.startsWith("/")) return image;
  const base = process.env.NEXT_PUBLIC_UPLOADS_URL ?? `${API}/uploads`;
  return `${base}/${image}`;
}

